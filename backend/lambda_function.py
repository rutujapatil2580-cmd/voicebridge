import json
import os
import time
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")

T = {
    "commands": os.environ.get("COMMANDS_TABLE", "commands"),
    "variants": os.environ.get("VARIANTS_TABLE", "variants"),
    "shortcuts": os.environ.get("SHORTCUTS_TABLE", "shortcuts"),
    "devices": os.environ.get("DEVICES_TABLE", "devices"),
    "logs": os.environ.get("LOGS_TABLE", "logs"),
}

HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
}


def clean(o):
    if isinstance(o, list):
        return [clean(i) for i in o]
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, Decimal):
        return int(o) if o % 1 == 0 else float(o)
    return o


def resp(code, body):
    return {"statusCode": code, "headers": HEADERS, "body": json.dumps(clean(body))}


def list_items(table, user_id):
    r = dynamodb.Table(T[table]).query(KeyConditionExpression=Key("userId").eq(user_id))
    return r.get("Items", [])


def perform(user_id, device_name, action):
    """Nakli (simulated) device control: sirf DynamoDB mein state badalta hai."""
    state_map = {"on": "on", "off": "off", "lock": "locked", "unlock": "unlocked"}
    new_state = state_map.get(action, action)
    dynamodb.Table(T["devices"]).put_item(
        Item={"userId": user_id, "deviceName": device_name, "state": new_state}
    )
    return {"deviceName": device_name, "state": new_state}


def run_shortcut(user_id, shortcut_name):
    item = dynamodb.Table(T["shortcuts"]).get_item(
        Key={"userId": user_id, "shortcutName": shortcut_name}
    ).get("Item")
    if not item:
        return None
    results = []
    for step in item.get("steps", []):
        cmd = dynamodb.Table(T["commands"]).get_item(
            Key={"userId": user_id, "commandId": step}
        ).get("Item")
        if cmd:
            results.append(perform(user_id, cmd["device"], cmd["action"]))
    return results


def lambda_handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("rawPath", "/")
    qs = event.get("queryStringParameters") or {}
    user_id = qs.get("userId", "demo")

    if method == "OPTIONS":
        return resp(200, {})

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception:
        return resp(400, {"error": "Invalid JSON"})

    if method == "POST" and body.get("userId"):
        user_id = body["userId"]

    if path == "/hello":
        return resp(200, {"message": "VoiceBridge API chal rahi hai"})

    if path == "/commands":
        if method == "GET":
            return resp(200, list_items("commands", user_id))
        if method == "POST":
            if not body.get("commandId"):
                return resp(400, {"error": "commandId required"})
            body["userId"] = user_id
            dynamodb.Table(T["commands"]).put_item(Item=body)
            return resp(201, body)

    if path == "/shortcuts":
        if method == "GET":
            return resp(200, list_items("shortcuts", user_id))
        if method == "POST":
            if not body.get("shortcutName"):
                return resp(400, {"error": "shortcutName required"})
            body["userId"] = user_id
            dynamodb.Table(T["shortcuts"]).put_item(Item=body)
            return resp(201, body)

    if path == "/variants" and method == "GET":
        return resp(200, list_items("variants", user_id))

    if path == "/logs" and method == "GET":
        return resp(200, list_items("logs", user_id))

    if path == "/devices" and method == "GET":
        return resp(200, list_items("devices", user_id))

    if path == "/runshortcut" and method == "POST":
        if not body.get("shortcutName"):
            return resp(400, {"error": "shortcutName required"})
        results = run_shortcut(user_id, body["shortcutName"])
        if results is None:
            return resp(404, {"error": "shortcut not found"})
        dynamodb.Table(T["logs"]).put_item(Item={
            "userId": user_id,
            "time": str(int(time.time() * 1000)),
            "heard": body.get("heard", body["shortcutName"]),
            "matched": "shortcut:" + body["shortcutName"],
            "confirmed": True,
        })
        return resp(200, {"shortcut": body["shortcutName"], "results": results})

    if path == "/perform" and method == "POST":
        if not body.get("deviceName") or not body.get("action"):
            return resp(400, {"error": "deviceName and action required"})
        result = perform(user_id, body["deviceName"], body["action"])
        dynamodb.Table(T["logs"]).put_item(Item={
            "userId": user_id,
            "time": str(int(time.time() * 1000)),
            "heard": body.get("heard", ""),
            "matched": body["deviceName"] + "_" + body["action"],
            "confirmed": True,
        })
        return resp(200, result)

    return resp(404, {"error": "Not found"})
