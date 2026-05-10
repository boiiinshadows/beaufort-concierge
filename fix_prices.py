with open('src/app/api/chat/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# The broken pattern is \\,000 (4 chars: backslash backslash comma zero zero zero)
broken = '\\\\'  + ',000'

content = content.replace('Marketed from ' + broken + '.\n', 'Marketed from $550,000.\n')
content = content.replace('marketed from ' + broken + '.', 'marketed from $98,000.')
content = content.replace('Marketed from ' + broken + ' -', 'Marketed from $91,000 -')

with open('src/app/api/chat/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify all three prices are present
for price in ['$550,000', '$98,000', '$91,000']:
    found = price in content
    print(f'{price}: {"OK" if found else "MISSING"}')
