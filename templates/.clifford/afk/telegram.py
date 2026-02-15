import argparse
import json
import sys
import urllib.request
import urllib.parse
import time

def send_message(token, chat_id, text):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }).encode("utf-8")
    
    try:
        with urllib.request.urlopen(url, data=data, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Error sending message: {e}", file=sys.stderr)
        sys.exit(1)

def get_updates(token, offset=None, timeout=30):
    url = f"https://api.telegram.org/bot{token}/getUpdates"
    params = {"timeout": timeout}
    if offset:
        params["offset"] = offset
        
    url_with_params = url + "?" + urllib.parse.urlencode(params)
    
    try:
        with urllib.request.urlopen(url_with_params, timeout=timeout+10) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as e:
        print(f"Error getting updates: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Clifford Telegram Adapter")
    parser.add_argument("--token", required=True, help="Telegram Bot Token")
    parser.add_argument("--chat_id", help="Telegram Chat ID")
    parser.add_argument("--message", help="Message to send")
    parser.add_argument("--notify", action="store_true", help="Send a notification")
    parser.add_argument("--listen", action="store_true", help="Listen for a response")
    parser.add_argument("--test", action="store_true", help="Send a test message")
    
    args = parser.parse_args()

    if args.test:
        if not args.chat_id:
            print("Error: --chat_id is required for --test", file=sys.stderr)
            sys.exit(1)
        send_message(args.token, args.chat_id, "Hello from Clifford 🚀")
        print("Test message sent.")

    elif args.notify:
        if not args.chat_id or not args.message:
            print("Error: --chat_id and --message are required for --notify", file=sys.stderr)
            sys.exit(1)
        send_message(args.token, args.chat_id, args.message)
        print("Notification sent.")

    elif args.listen:
        # print("Listening for messages...", file=sys.stderr)
        last_update_id = None
        
        # Clear existing updates
        updates = get_updates(args.token, offset=-1, timeout=0)
        if updates.get("result"):
            last_update_id = updates["result"][-1]["update_id"] + 1

        while True:
            updates = get_updates(args.token, offset=last_update_id)
            if not updates.get("ok"):
                print(f"API Error: {updates.get('description')}", file=sys.stderr)
                sys.exit(1)
                
            for update in updates.get("result", []):
                msg = update.get("message")
                if not msg:
                    continue
                
                cid = msg["chat"]["id"]
                text = msg.get("text", "")
                
                if not args.chat_id:
                    # Auto-detect mode: print chat_id and exit
                    print(cid)
                    sys.exit(0)
                elif str(cid) == str(args.chat_id):
                    # Listen for response from specific chat: print text and exit
                    print(text)
                    sys.exit(0)
                
                last_update_id = update["update_id"] + 1

if __name__ == "__main__":
    main()
