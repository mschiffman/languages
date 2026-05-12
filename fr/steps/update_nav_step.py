import os
import re

# --- CONFIGURATION ---
# The filename currently in your HTML that needs to be replaced
OLD_FILENAME = "steps.js"

# The new filename you want to swap in
NEW_FILENAME = "nav-step.js"

# Extensions of files to scan
FILE_EXTENSIONS = ('.html', '.htm', '.php')

# --- REGEX EXPLANATION ---
# 1. (src=["'][^"']*?)        -> Capture Group 1: Matches 'src="' followed by the path 
#                                up until the filename (e.g., src="../../assets/js/)
# 2. {re.escape(OLD_FILENAME)} -> Matches the literal 'steps.js'
# 3. (["'])                   -> Capture Group 2: Matches the closing quote (" or ')
regex_pattern = re.compile(
    rf'(src=["\'][^"\']*?){re.escape(OLD_FILENAME)}(["\'])'
)

def update_files(start_path):
    count = 0
    print(f"Scanning to rename '{OLD_FILENAME}' to '{NEW_FILENAME}'...\n")

    for root, dirs, files in os.walk(start_path):
        for file in files:
            if file.lower().endswith(FILE_EXTENSIONS):
                file_path = os.path.join(root, file)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Perform the substitution
                    # \1 = the src path (e.g., src="../../assets/js/)
                    # {NEW_FILENAME} = nav-step.js
                    # \2 = the closing quote
                    new_content = regex_pattern.sub(rf'\1{NEW_FILENAME}\2', content)
                    
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