
path = 'src/pages/EventDetails.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 0-based indices
# Line 1 is index 0.
# Line 50 is index 49.
# Line 51 (Start of duplicate) is index 50.
# Line 666 (Start of good component) is index 665.

top_part = lines[:50] # 0 to 49

esports_games = [
    "\n",
    "// E-Sports Games Configuration\n",
    "const ESPORTS_GAMES: Record<string, { name: string; image: string; color: string }> = {\n",
    "    valorant: { name: 'Valorant', image: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/80eb7ecc9bf36b8a5d215c5b01c93b4b32c5c263-1920x1080.jpg', color: 'from-red-500 to-red-700' },\n",
    "    freefire: { name: 'Free Fire', image: 'https://staticg.sportskeeda.com/editor/2022/05/c461c-16533606193095-1920.jpg', color: 'from-orange-500 to-yellow-600' },\n",
    "    bgmi: { name: 'BGMI', image: 'https://staticg.sportskeeda.com/editor/2022/07/dfe94-16580991729498-1920.jpg', color: 'from-yellow-500 to-amber-600' },\n",
    "};\n",
    "\n"
]

bottom_part = lines[665:] # 665 to End

new_content = top_part + esports_games + bottom_part

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(new_content)

print("Fixed EventDetails.tsx concatenation.")
