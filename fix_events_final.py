
path = 'src/pages/Events.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

output_lines = []
skip = False
esports_count = 0

i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.strip()
    
    # 1. Deduplicate ESPORTS_GAMES
    if 'const ESPORTS_GAMES = [' in line:
        esports_count += 1
        if esports_count > 1:
            # Skip this line and following 5 lines (definition block)
            # The block is 6 lines typically including comments/newlines?
            # // E-Sports... (line - 1)
            # const ... (line)
            # { ... }
            # { ... }
            # { ... }
            # ];
            
            # Since I'm iterating line by line, I should have detected the comment before?
            # Let's simple skip until ];
            skip = True
            
            # Remove the previous line if it was the comment?
            if len(output_lines) > 0 and 'E-Sports Games Configuration' in output_lines[-1]:
                output_lines.pop()
                
            i += 1
            continue
            
    if skip and '];' in line:
        skip = False
        i += 1
        continue
    
    if skip:
        i += 1
        continue

    # 2. Fix Conflict at 651 (Feature Badge)
    # Start of Block A (approx line 640)
    if 'bg-gradient-to-r from-yellow-500/90' in line:
        # We want to skip from here until "=======" and then skip ")}"
        # But wait, we need to match carefully.
        # Let's peek ahead to see if "=======" follows within 15 lines.
        is_conflict = False
        for k in range(1, 20):
            if i + k < len(lines) and '=======' in lines[i+k]:
                is_conflict = True
                break
        
        if is_conflict:
            # Skip until =======
            while '=======' not in lines[i]:
                i += 1
            # Now at =======. Skip it.
            i += 1
            # Next line might be ")}" which we also want to skip (652)
            if ')}' in lines[i].strip():
                i += 1
            continue

    # 3. Fix Conflict at 733 (Prize Pool)
    # Start of Block A (approx line 731)
    if 'grid-cols-2' in line and 'grid gap-2 mb-3' in line:
        # Check if ======= follows
        is_conflict = False
        for k in range(1, 5):
            if i + k < len(lines) and '=======' in lines[i+k]:
                is_conflict = True
                break
        
        if is_conflict:
            # Skip until =======
            while '=======' not in lines[i]:
                i += 1
            # Now at =======. Skip it.
            i += 1
            continue

    # 4. Remove any stray =======
    if '=======' in stripped:
        i += 1
        continue

    output_lines.append(line)
    i += 1

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(output_lines)

print("Fixed Events.tsx duplicates and conflicts.")
