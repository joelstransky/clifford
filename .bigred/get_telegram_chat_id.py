import urllib.request
import json
import sys

TOKEN = "8535821429:AAGWQI2Tk0vwznPcUyCuRkORkRkgRzMYRmE"

def get_chat_id():
    url = f"https://api.telegram.org/bot{TOKEN}/getUpdates"
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            if data["ok"] and data["result"]:
                # Get the last chat_id that sent a message
                return data["result"][-1]["message"]["chat"]["id"]
    except Exception as e:
        print(f"Error fetching updates: {e}")
    return None

if __name__ == "__main__":
    chat_id = get_chat_id()
    if chat_id:
        print(chat_id)
    else:
        print("No chat_id found. Please message the bot first.")
        sys.exit(1)
