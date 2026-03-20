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
token = result.get('access_token', '')
print(f'Login: {"OK" if token else "FAIL"}')

# Get/Create CAMS company
companies = api_call(f'{API}/users/companies', token=token)
cams_id = None
for c in companies:
    if c.get('type') == 'TIER1':
        cams_id = c['id']
        print(f'Found: {c["name"]} (TIER1)')
        break

if not cams_id:
    result = api_call(f'{API}/users/companies', {'name': '(주)캠스', 'code': 'CAMS_HQ', 'type': 'TIER1'}, 'POST', token)
    cams_id = result.get('id', '')
    print(f'Created: (주)캠스')

employees = [
    ('103577','김정중','010-3743-3410','sunjune28@icams.co.kr','회장','임원','EXEC_APPROVER'),
    ('103576','김선구','010-8879-0138','suk@icams.co.kr','부회장','임원','EXEC_APPROVER'),
    ('103485','홍정수','010-2080-8933','json@icams.co.kr','대표이사','임원','EXEC_APPROVER'),
    ('103502','김정은','010-3615-3340','cekim@icams.co.kr','대표이사','임원','EXEC_APPROVER'),
    ('103493','정환','010-9871-9801','radiohead@icams.co.kr','상무이사','임원','EXEC_APPROVER'),
    ('103564','배형엽','010-4701-2325','hybae@icams.co.kr','상무이사','임원','EXEC_APPROVER'),
    ('103573','박상병','010-4616-9893','mole94@icams.co.kr','이사','임원','TIER1_EDITOR'),
    ('103574','박래선','010-4418-3820','prs1401@icams.co.kr','이사','임원','TIER1_EDITOR'),
    ('103619','양창민','','','이사','임원','EXEC_APPROVER'),
    ('203575','전지혜','010-2639-7556','wisdommanaaa@icams.co.kr','이사','임원','TIER1_EDITOR'),
    ('103346','최연상','010-6646-7957','yschoi@icams.co.kr','팀장','생산팀','TIER1_EDITOR'),
    ('103514','박준현','010-7553-4324','wnsgus4324@icams.co.kr','PM','생산팀','TIER1_EDITOR'),
    ('103518','김환기','010-9369-5014','hwanki@icams.co.kr','PM','생산팀','TIER1_EDITOR'),
    ('103617','박석인','010-8859-2375','','PM','생산팀','TIER1_EDITOR'),
    ('103397','오명진','010-9850-0215','afero@icams.co.kr','팀장','생산기술팀','TIER1_EDITOR'),
    ('103540','이세영','010-3856-9981','lsy1659@icams.co.kr','PM','생산기술팀','TIER1_EDITOR'),
    ('103550','장지우','010-8701-4110','hanafos941@icams.co.kr','PM','생산기술팀','TIER1_EDITOR'),
    ('103613','정상협','','shjeong4066@icams.co.kr','PM','생산기술팀','TIER1_EDITOR'),
    ('103459','서진명','010-8611-1549','jmseo@icams.co.kr','팀장','개발팀','TIER1_EDITOR'),
    ('103543','김신영','010-3950-2726','rud123@icams.co.kr','PE','개발팀','TIER1_EDITOR'),
    ('103560','채정훈','010-7151-1465','chaejh1234@icams.co.kr','PE','개발팀','TIER1_EDITOR'),
    ('103498','임승화','010-9629-3059','tmdghk0426@icams.co.kr','PM','개발팀','TIER1_EDITOR'),
    ('103535','김준수','010-7299-7483','jsk7483@icams.co.kr','PM','개발팀','TIER1_EDITOR'),
    ('103544','김민성','010-3239-7128','312kkmmss@icams.co.kr','PM','개발팀','TIER1_EDITOR'),
    ('103614','조대운','','woon6888@icams.co.kr','PM','개발팀','TIER1_EDITOR'),
    ('103449','김부영','010-4588-8524','kimby82@icams.co.kr','팀장','자재관리팀','TIER1_EDITOR'),
    ('103541','홍규현','010-4195-7155','rbgus159@icams.co.kr','PM','자재관리팀','TIER1_EDITOR'),
    ('103455','안광헌','010-3205-3063','ccacci22@icams.co.kr','팀장','설계팀','TIER1_EDITOR'),
    ('103398','정우철','010-6488-0146','woochil2@icams.co.kr','PE','설계팀','TIER1_EDITOR'),
    ('103466','최진영','010-5092-5196','jinyoung@icams.co.kr','PE','설계팀','TIER1_EDITOR'),
    ('103508','윤상원','010-2252-9929','sangwonyun@icams.co.kr','PM','양산품질팀','TIER1_EDITOR'),
    ('103515','정지원','010-9978-0275','jjw2129@icams.co.kr','PM','양산품질팀','TIER1_EDITOR'),
    ('103554','이영찬','010-9723-5413','loc5413@icams.co.kr','PM','양산품질팀','TIER1_EDITOR'),
    ('103558','김주환','010-5772-8982','kjh8005@icams.co.kr','PM','양산품질팀','TIER1_EDITOR'),
    ('103567','김영준','010-9513-9325','kimasma@icams.co.kr','PM','양산품질팀','TIER1_EDITOR'),
    ('103394','성세용','010-8619-2233','sungsy@icams.co.kr','팀장','영업관리팀','TIER1_EDITOR'),
    ('103495','이승준','010-5114-5931','lje5931@icams.co.kr','PM','영업관리팀','TIER1_EDITOR'),
    ('103527','김정학','010-6275-8959','kjh0910@icams.co.kr','PM','영업관리팀','TIER1_EDITOR'),
    ('103538','이상윤','010-5958-9865','lsy0838@icams.co.kr','PM','영업관리팀','TIER1_EDITOR'),
    ('203566','김현정','010-9796-2358','jung2358@icams.co.kr','PM','영업관리팀','TIER1_EDITOR'),
    ('103476','이시면','010-4186-4288','lsm2579@icams.co.kr','PM','전산팀','TIER1_EDITOR'),
    ('203347','정슬아','010-6313-7465','wjdtmfdk51@icams.co.kr','PM','경영관리팀','TIER1_EDITOR'),
    ('103215','배철성','010-8485-2585','103215@icams.co.kr','PM','상생협력팀','TIER1_EDITOR'),
    ('103561','이갑연','010-8872-6512','leegy1229@icams.co.kr','PM','상생협력팀','TIER1_EDITOR'),
    ('103562','김병주','010-3633-9581','bjkim@icams.co.kr','PM','상생협력팀','TIER1_EDITOR'),
    ('103565','윤두섭','010-5601-3493','seogdu@icams.co.kr','PM','상생협력팀','TIER1_EDITOR'),
    ('103523','한동희','010-7471-7588','boss2618@icams.co.kr','별정직','별정직','TIER1_EDITOR'),
    ('103534','박상원','010-3215-2628','swpark@icams.co.kr','PM','함평팀','TIER1_EDITOR'),
    ('103553','김재영','010-6437-6460','msk9414@icams.co.kr','PM','함평팀','TIER1_EDITOR'),
    ('103611','문용주','010-3374-1889','yjmun@icams.co.kr','PM','함평팀','TIER1_EDITOR'),
    ('103612','김명진','010-9680-0030','audwls0320@icams.co.kr','PM','함평팀','TIER1_EDITOR'),
]

success = 0
fail = 0
for emp_id, name, phone, email, position, team, role in employees:
    user_data = {
        'email': emp_id,
        'password': emp_id,
        'name': name,
        'role': role,
        'companyId': cams_id,
    }
    if phone:
        user_data['phone'] = phone
    if position:
        user_data['position'] = position
    if team:
        user_data['team'] = team

    result = api_call(f'{API}/users', user_data, 'POST', token)
    if 'error' in result:
        fail += 1
        print(f'  X {emp_id} {name} - err:{result["error"]}')
    else:
        success += 1
        rl = 'EXEC' if role == 'EXEC_APPROVER' else 'EDITOR'
        print(f'  OK {emp_id} {name} ({position}/{team}) [{rl}]')

print(f'\nTotal: {success} OK, {fail} FAIL')
