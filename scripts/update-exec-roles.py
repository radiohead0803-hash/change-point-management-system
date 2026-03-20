import urllib.request, json, ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

API = 'https://change-point-management-system-production.up.railway.app/api'

def api_call(url, data=None, method='GET', token=None):
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        return json.loads(urllib.request.urlopen(req, context=ctx).read())
    except urllib.error.HTTPError as e:
        return {'error': e.code, 'msg': e.read().decode()[:200]}

# Login
result = api_call(f'{API}/auth/login', {'email': 'admin', 'password': '1234'}, 'POST')
token = result['access_token']

# Get all users
all_users = api_call(f'{API}/users', token=token)
print(f'Total users: {len(all_users)}')

# Find EXEC_APPROVER users and change to TIER1_REVIEWER except 양창민(103619)
count = 0
for u in all_users:
    if u.get('role') == 'EXEC_APPROVER' and u.get('email') != '103619':
        result = api_call(f"{API}/users/{u['id']}", {'role': 'TIER1_REVIEWER'}, 'PATCH', token)
        if 'error' not in result:
            count += 1
            print(f"  OK {u['email']} {u['name']} EXEC_APPROVER -> TIER1_REVIEWER (중역)")
        else:
            print(f"  FAIL {u['name']}: {result}")
    elif u.get('role') == 'EXEC_APPROVER' and u.get('email') == '103619':
        print(f"  KEEP {u['email']} {u['name']} = EXEC_APPROVER (전담중역)")

print(f'\nUpdated: {count} users to TIER1_REVIEWER (중역)')
