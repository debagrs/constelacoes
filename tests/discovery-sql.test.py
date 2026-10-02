import sqlite3, re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
schema=(root/'turso/schema.sql').read_text()
con=sqlite3.connect(':memory:')
con.executescript(re.search(r'CREATE TABLE IF NOT EXISTS submissions \([\s\S]*?\);',schema).group())
con.execute('CREATE TABLE entities(source_url TEXT)')
source=(root/'src/lib/data/discovery.functions.ts').read_text()
sql=re.search(r'execute\(`(INSERT OR IGNORE[\s\S]*?)`',source).group(1)
args=['id','work','artist','description','date','culture','https://image.example/x.jpg','https://source.example/work','license','[]','{}','Curadoria','curator@example.com','research','reviewer','now','now','https://source.example/work','https://source.example/work']
con.execute(sql,args)
assert con.execute('SELECT count(*) FROM submissions').fetchone()[0]==1
con.execute(sql,args)
assert con.execute('SELECT count(*) FROM submissions').fetchone()[0]==1
con.execute("UPDATE submissions SET status='approved'")
con.execute(sql,args)
assert con.execute('SELECT count(*) FROM submissions').fetchone()[0]==1
assert con.execute('SELECT image_url FROM submissions').fetchone()[0]==args[6]
assert con.execute('SELECT count(*) FROM entities').fetchone()[0]==0
con.execute('DELETE FROM submissions')
con.execute('INSERT INTO entities VALUES (?)',(args[7],))
con.execute(sql,args)
assert con.execute('SELECT count(*) FROM submissions').fetchone()[0]==0
print('PASS: discovery stores the photo in pending submissions, deduplicates repeated/approved/published sources, and never publishes automatically.')
