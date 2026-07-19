import os

filepath = r"c:\Users\Tanvir Alam\Downloads\New folder upscaled\src\pages\utility\ResumeBuilder.jsx"
with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Part 1: lines 0 to 668 (up to line 668 inclusive, 0-indexed up to 667)
part1 = lines[:668]

# Part 2: Left Column (lines 669 to 982 inclusive, 0-indexed 668 to 982)
part2 = lines[668:982]

# Part 3: separator (line 983, 0-indexed 982)
part3 = lines[982:983]

# Part 4: Right Column (lines 984 to 1233 inclusive, 0-indexed 983 to 1232)
part4 = lines[983:1232]

# Part 5: rest of file (line 1234 onwards, 0-indexed 1232 onwards)
part5 = lines[1232:]

part2[0] = part2[0].replace("Left Column", "Right Column")
part4[0] = part4[0].replace("Right Column", "Left Column")
part1[666] = part1[666].replace("gridTemplateColumns: '1fr 1.1fr'", "gridTemplateColumns: '1.2fr 1fr'")

new_lines = part1 + part4 + part3 + part2 + part5

with open(filepath, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Swapped successfully without print errors!")
