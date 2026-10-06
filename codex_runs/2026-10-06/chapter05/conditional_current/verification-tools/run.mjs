import {spawnSync} from 'node:child_process';
import {appendFileSync,writeFileSync} from 'node:fs';
const [name,...args]=process.argv.slice(2);
const r=spawnSync(args[0],args.slice(1),{encoding:'utf8',env:{...process.env,npm_config_cache:process.cwd()+'/.verification/npm-cache',PLAYWRIGHT_BROWSERS_PATH:process.cwd()+'/.verification/browsers',NEXT_TELEMETRY_DISABLED:'1'}});
writeFileSync('evidence/logs/'+name+'.log',(r.stdout??'')+(r.stderr??''));
appendFileSync('evidence/session.md',`\nコマンド ${JSON.stringify(args)}: exit ${r.status}; evidence/logs/${name}.log\n`);
console.log(name,'exit',r.status,(r.stdout??'').slice(-1500),(r.stderr??'').slice(-1000));process.exit(r.status??1);
