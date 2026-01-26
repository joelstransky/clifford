import urllib.request
import urllib.parse
import json
import os
import sys

TOKEN = "8535821429:AAGWQI2Tk0vwznPcUyCuRkORkRkgRzMYRmE"
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "telegram_config.json")

def get_stored_chat_id():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f).get("chat_id")
    return None

def store_chat_id(chat_id):
    with open(CONFIG_FILE, "w") as f:
        json.dump({"chat_id": chat_id}, f)

def fetch_latest_chat_id():
    url = f"https://api.telegram.org/bot{TOKEN}/getUpdates"
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            if data["ok"] and data["result"]:
                for update in reversed(data["result"]):
                    if "message" in update:
                        return update["message"]["chat"]["id"]
    except Exception as e:
        print(f"Error fetching updates: {e}")
    return None

def send_message(text):
    chat_id = get_stored_chat_id()
    if not chat_id:
        chat_id = fetch_latest_chat_id()
        if chat_id:
            store_chat_id(chat_id)
        else:
            print("Error: No chat_id found. Please message the bot first.")
            return False

    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
    data = urllib.parse.urlencode({"chat_id": chat_id, "text": text}).encode()
    try:
        with urllib.request.urlopen(url, data=data) as response:
            res = json.loads(response.read().decode())
            return res.get("ok", False)
    except Exception as e:
        print(f"Error sending message: {e}")
        return False

if __name__ == "__main__":
    message = sys.argv[1] if len(sys.argv) > 1 else "Ready for review!"
    if send_message(message):
        print("Notification sent!")
    else:
        sys.exit(1)
