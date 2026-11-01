import json, collections, sys
r = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'oa.json')) + (json.load(open(sys.argv[2])) if len(sys.argv) > 2 else [])
errs = [x for x in r if 'error' in x]
print('fouten:', len(errs), errs[0]['error'][:300] if errs else '')
C=['krijger','dief','magier','alchemist','stormroeper','necromant','bezweerder']
D=['Pelgrim','Avonturier','Veteraan','Meester','Legende','Eeuwige N.']
def tab(strat, build):
    print(f'\n== winst% strategie={strat} build={build}')
    print('klasse       ' + ' '.join(f'{d[:9]:>9}' for d in D))
    for c in C:
        row=[]
        for d in range(6):
            xs=[x for x in r if x['cls']==c and x['diff']==d and x['strat']==strat and x['build']==build and 'error' not in x]
            row.append(f"{100*sum(x['win'] for x in xs)/len(xs):>8.0f}%")
        print(f'{c:12} ' + ' '.join(row))
[tab(s,b) for s,b in [('simpel','focus'),('slim','focus'),('kruis','focus'),('slim','bal')] if any(x['strat']==s and x['build']==b for x in r)]
# waar stranden tochten (slim focus)
print('\n== doodsoorzaak (slim, focus) per moeilijkheid')
for d in range(6):
    xs=[x for x in r if x['diff']==d and x['strat']=='slim' and x['build']=='focus' and not x.get('win') and 'error' not in x]
    cnt=collections.Counter((x['died'] or '?').split(':')[0] + ' r' + str(x['reg']) for x in xs)
    print(D[d], dict(cnt.most_common(6)))
print('\n== eindniveau gemiddeld (slim focus, winnaars)')
for d in range(6):
    xs=[x['lvl'] for x in r if x['diff']==d and x['strat']=='slim' and x['build']=='focus' and x.get('win')]
    print(D[d], round(sum(xs)/len(xs),1) if xs else '-')
print('\n== gem. beurten per baasgevecht (slim focus), per regio, per moeilijkheid')
for d in range(6):
    bt=collections.defaultdict(list)
    for x in r:
        if x['diff']==d and x['strat']=='slim' and x['build']=='focus':
            for reg,t in x.get('bossTurns',[]): bt[reg].append(t)
    print(D[d], {k: round(sum(v)/len(v),1) for k,v in sorted(bt.items())})
