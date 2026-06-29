import os
import imaplib
import email
from email.header import decode_header
import sys
import json
from pathlib import Path

# Reconfigure stdout for utf-8 encoding support
sys.stdout.reconfigure(encoding='utf-8')

# ── Configuration ──────────────────────────────────────────────────────────────

def load_config():
    config_path = Path(__file__).parent / "settings.json"
    if not config_path.exists():
        print(f"Error: Config file not found at {config_path}")
        sys.exit(1)
    with open(config_path, "r") as f:
        return json.load(f)

config = load_config()
credentials = config.get("credentials", {})
channels_config = config.get("channels", [])

GMAIL_USER = credentials.get("GMAIL_USER") or os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = credentials.get("GMAIL_APP_PASSWORD") or os.getenv("GMAIL_APP_PASSWORD", "")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def fetch_reports(progress_callback=None):
    def log_progress(msg, step=None, total=None):
        print(msg)
        if progress_callback:
            progress_callback(msg, step, total)

    if not GMAIL_APP_PASSWORD:
        log_progress("Gmail App Password not configured. Skipping email fetch.")
        return {"status": "skipped", "message": "GMAIL_APP_PASSWORD not set in settings"}
        
    log_progress(f"Connecting to Gmail for {GMAIL_USER}...")
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(GMAIL_USER, GMAIL_APP_PASSWORD)
        mail.select("inbox")
        
        import datetime
        since_date = (datetime.date.today() - datetime.timedelta(days=30)).strftime("%d-%b-%Y")
        
        # Build search query from all channel keywords
        all_keywords = []
        for ch in channels_config:
            kws = ch.get("email_keywords", [])
            all_keywords.extend(kws)
            
        if not all_keywords:
            log_progress("No email keywords configured for any channel. Skipping.")
            return {"status": "skipped", "message": "No email keywords"}
            
        # Simplistic OR search for IMAP, normally needs nesting. We'll search for SINCE and filter in python if IMAP OR is too complex.
        # It's better to just fetch SINCE and then filter by subject locally since we are looking at 30 days.
        search_query = f'SINCE {since_date}'
        status, messages = mail.search(None, search_query)
        if status != "OK" or not messages[0]:
            log_progress("No recent emails found.")
            mail.logout()
            return {"status": "success", "downloaded": 0, "message": "No emails found in search."}
            
        mail_ids = messages[0].split()
        total_emails = len(mail_ids)
        log_progress(f"Found {total_emails} recent emails. Scanning for attachments...")
        
        stats = {ch["id"]: 0 for ch in channels_config}
        downloaded_files = []
        
        for idx, mail_id in enumerate(mail_ids):
            status, data = mail.fetch(mail_id, "(RFC822)")
            if status != "OK":
                continue
                
            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            subject_header = msg["Subject"]
            subject = ""
            if subject_header:
                decoded_parts = decode_header(subject_header)
                for part_bytes, encoding in decoded_parts:
                    if isinstance(part_bytes, bytes):
                        subject += part_bytes.decode(encoding or "utf-8", errors="ignore")
                    else:
                        subject += str(part_bytes)
            
            sender = msg.get("From", "")
            
            # Check if this email matches any channel
            matched_channel = None
            sub_lower = subject.lower()
            snd_lower = sender.lower()
            
            for ch in channels_config:
                kws = ch.get("email_keywords", [])
                for kw in kws:
                    kw_lower = kw.lower()
                    if kw_lower in sub_lower or kw_lower in snd_lower:
                        matched_channel = ch
                        break
                if matched_channel:
                    break
                    
            if not matched_channel:
                continue
                
            for part in msg.walk():
                if part.get_content_maintype() == "multipart":
                    continue
                if part.get("Content-Disposition") is None:
                    continue
                    
                filename = part.get_filename()
                if not filename:
                    continue
                    
                decoded_parts = decode_header(filename)
                decoded_fn = ""
                for part_bytes, encoding in decoded_parts:
                    if isinstance(part_bytes, bytes):
                        decoded_fn += part_bytes.decode(encoding or "utf-8", errors="ignore")
                    else:
                        decoded_fn += str(part_bytes)
                
                filename = os.path.basename(decoded_fn)
                
                if filename.endswith(".xlsx"):
                    dest_folder = None
                    if matched_channel.get("import_folder"):
                        dest_folder = os.path.join(SCRIPT_DIR, matched_channel["import_folder"])
                        
                    if dest_folder:
                        os.makedirs(dest_folder, exist_ok=True)
                        filepath = os.path.join(dest_folder, filename)
                        
                        if not os.path.exists(filepath):
                            with open(filepath, "wb") as f:
                                f.write(part.get_payload(decode=True))
                            stats[matched_channel["id"]] += 1
                            downloaded_files.append(filename)
                            log_progress(f"Downloaded new report: {filename} ({matched_channel['name']})")
                            
        mail.logout()
        total_downloads = sum(stats.values())
        log_progress(f"Gmail scan completed. Downloaded {total_downloads} new reports.")
        return {
            "status": "success",
            "downloaded": total_downloads,
            "stats": stats,
            "files": downloaded_files,
            "message": f"Gmail scan completed. Downloaded {total_downloads} new reports."
        }
        
    except Exception as e:
        log_progress(f"IMAP Connection/Auth Error: {e}")
        return {"status": "error", "message": f"Gmail fetch failed: {str(e)}"}

if __name__ == "__main__":
    res = fetch_reports()
    print("Result:", res)
