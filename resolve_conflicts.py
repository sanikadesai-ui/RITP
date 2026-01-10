
import os

filepath = 'src/pages/Events.tsx'

def resolve_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    iteration = 0
    while '<<<<<<<' in content:
        iteration += 1
        if iteration > 100:
            print("Error: Too many iterations, stuck in loop?")
            break
            
        # Find first closing marker. This marks the end of the innermost conflict.
        end_marker = '>>>>>>>'
        end_idx = content.find(end_marker)
        if end_idx == -1:
            break
            
        # Find the start marker corresponding to this block.
        # It must be the closest <<<<<<< before end_idx
        start_marker = '<<<<<<<'
        start_idx = content.rfind(start_marker, 0, end_idx)
        
        if start_idx == -1:
            print("Error: Found closing marker without opening marker")
            break
            
        # Find the separator
        sep_marker = '======='
        sep_idx = content.rfind(sep_marker, start_idx, end_idx)
        
        if sep_idx == -1:
            # If no separator, maybe it's a combined diff? 
            # In standard 3-way merge there is always a separator.
            # If missing, it's weird. We'll abort for safety or assume specific structure.
            print(f"Error: No ======= found in block at {start_idx}")
            break
            
        # Extract the content we want (the "stashed/incoming" changes)
        # It is located between sep_idx and end_idx
        
        # We need to be careful with newlines.
        # The line with ======= usually ends with newline.
        # The line with >>>>>>> usually starts after a newline.
        
        # Helper to find end of line
        def find_eol(text, pos):
            idx = text.find('\n', pos)
            return idx if idx != -1 else len(text)
            
        sep_line_end = find_eol(content, sep_idx)
        
        # The content starts after the newline of =======
        keep_start = sep_line_end + 1
        
        # The content ends before the >>>>>>> starts.
        # Usually >>>>>>> appears at start of line.
        keep_end = end_idx
        
        kept_content = content[keep_start:keep_end]
        
        # Now replace the whole block (from start of <<<<<<< to end of line of >>>>>>>)
        block_start = start_idx
        end_line_end = find_eol(content, end_idx)
        block_end = end_line_end + 1 # Include newline of >>>>>>> line if present
        
        print(f"Resolving conflict at char {block_start}: keeping content length {len(kept_content)}")
        
        content = content[:block_start] + kept_content + content[block_end:]
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

if os.path.exists(filepath):
    print(f"Processing {filepath}...")
    resolve_file(filepath)
    print("Done.")
else:
    print(f"File not found: {filepath}")
