
import os

filepath = 'src/pages/Events.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip() == '<<<<<<< Updated upstream':
        continue
    if line.strip() == '>>>>>>> Stashed changes':
        continue
    new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
    
print("Cleaned up remaining markers.")
