import os
import re
from datetime import datetime

# --- CONFIGURATION ---
# The specific file you want to target in the src attribute
TARGET_FILENAME = "nav-noun.js"

# Extensions of files to scan (add .php, .jsp, etc. if needed)
FILE_EXTENSIONS = ('.html', '.htm', '.php')

# Current date in YYMMDD format (e.g., 260113)
TODAY_VERSION = datetime.now().strftime('%y%m%d')

# --- REGEX EXPLANATION ---
# 1. (src=["'][^"']*)  -> Capture Group 1: Matches 'src="' followed by the path 
#                         (e.g., src="../../../assets/js/)
# 2. nav-noun\.js      -> Matches the literal filename
# 3. (?:\?v=\d+)?      -> Non-capturing group: Matches an optional existing version 
#                         (e.g., ?v=250101). The '?' at the end makes it optional.
# 4. (["'])            -> Capture Group 2: Matches the closing quote (" or ')
regex_pattern = re.compile(
    rf'(src=["\'][^"\']*?{re.escape(TARGET_FILENAME)})(?:\?v=\d+)?(["\'])'
)

def update_files(start_path):
    count = 0
    print(f"Scanning for '{TARGET_FILENAME}' to update version to ?v={TODAY_VERSION}...\n")

    for root, dirs, files in os.walk(start_path):
        for file in files:
            if file.lower().endswith(FILE_EXTENSIONS):
                file_path = os.path.join(root, file)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Perform the substitution
                    # \1 = the src path up to the filename
                    # ?v=... = the new version
                    # \2 = the closing quote
                    new_content = regex_pattern.sub(rf'\1?v={TODAY_VERSION}\2', content)
                    
                    # Only write to disk if changes were actually made
                    if content != new_content:
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"✅ Updated: {file_path}")
                        count += 1
                        
                except Exception as e:
                    print(f"❌ Error reading {file_path}: {e}")

    print(f"\nDone. {count} file(s) updated.")

if __name__ == "__main__":
    # '.' means the current directory where the script is located
    update_files('.')