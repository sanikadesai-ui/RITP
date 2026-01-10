
import os

files_to_fix = [
    'src/pages/EventDetails.tsx',
    'src/components/RegistrationPage.tsx',
    'src/components/EventDetailsModal.tsx',
    'src/components/admin/ImageCropper.tsx'
]

def resolve_file(path):
    print(f"Processing {path}...")
    if not os.path.exists(path):
        print(f"  File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Safety Check: Infinite loop prevention
    iteration = 0
    
    # We loop as long as there are markers
    while '<<<<<<<' in content:
        iteration += 1
        if iteration > 500: # Increased limit for large files
            print("  Error: Too many iterations, stuck in loop?")
            break
            
        # Find first closing marker. This marks the end of the innermost conflict.
        end_marker = '>>>>>>>'
        end_idx = content.find(end_marker)
        if end_idx == -1:
            print("  Warning: Opening marker found but no closing marker.")
            break
            
        # Find the start marker corresponding to this block.
        # It must be the closest <<<<<<< before end_idx
        start_marker = '<<<<<<<'
        start_idx = content.rfind(start_marker, 0, end_idx)
        
        if start_idx == -1:
            # This happens if >>>>>>> is before any <<<<<<< (malformed)
            print("  Error: Closing marker found before opening marker?")
            # Force advance past this >>>>>>> to avoid infinite loop
            # But wait, we are searching for <<<<<<< BEFORE end_idx.
            # If rfind returns -1, it means there is no <<<<<<< before.
            # So we have a stray >>>>>>>. We should remove it or what?
            # Let's clean it up.
            content = content[:end_idx] + content[end_idx + len(end_marker) + 16:] # +16 to skip " Stashed changes" roughly.. better to find newline.
            continue
            
        # Find the separator
        sep_marker = '======='
        sep_idx = content.rfind(sep_marker, start_idx, end_idx)
        
        if sep_idx == -1:
            print(f"  Error: No ======= found in block at {start_idx}")
            # Malformed block. Remove start marker to proceed?
            # Or assume it's valid content and just remove markers?
            # If no separator, git usually treats it as "both added"? Or specific merge strategy?
            # Let's just remove the markers and keep everything in between? 
            # Or finding newlines.
            
            # Helper to find end of line
            def find_eol(text, pos):
                idx = text.find('\n', pos)
                return idx if idx != -1 else len(text)
                
            start_line_end = find_eol(content, start_idx)
            end_line_end = find_eol(content, end_idx)
            
            # Remove start and end lines
            # content = content[:start_idx] + content[start_line_end+1:end_idx] + content[end_line_end+1:]
            
            # But usually this means our parsing is wrong. 
            # Let's skip for now to avoid breaking code.
            break
            
        # Helper to find end of line
        def find_eol(text, pos):
            idx = text.find('\n', pos)
            return idx if idx != -1 else len(text)
            
        sep_line_end = find_eol(content, sep_idx)
        
        # The content we want (incoming/stashed) starts after the newline of =======
        keep_start = sep_line_end + 1
        
        # The content ends before the >>>>>>> starts.
        keep_end = end_idx
        
        kept_content = content[keep_start:keep_end]
        
        # Now replace the whole block
        block_start = start_idx
        end_line_end = find_eol(content, end_idx)
        block_end = end_line_end + 1 
        
        # print(f"  Resolving conflict at char {block_start}")
        
        content = content[:block_start] + kept_content + content[block_end:]
        
    # Second Pass: Clean up any stray markers that might have been skipped or malformed
    # Sometimes <<<<<<< HEAD vs <<<<<<< Updated upstream causes issues if logic expects specific strings
    # We just look for the symbols <<<<<<< and >>>>>>> and =======
    
    lines = content.splitlines()
    final_lines = []
    for line in lines:
        s = line.strip()
        if s.startswith('<<<<<<<') or s.startswith('>>>>>>>') or s.startswith('======='):
            continue
        final_lines.append(line)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(final_lines))
    print(f"  Done fixing {path}.")

for f in files_to_fix:
    resolve_file(f)
