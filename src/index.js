#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runAudit } from './audit.js';
import { writeJson, writeMarkdown } from './writers.js';


const argv = yargs(hideBin(process.argv))
.scriptName('site-auditor')
.usage('$0 <url> [options]')
.positional('url', { describe: 'URL a auditar', type: 'string' })
.option('out', { alias: 'o', type: 'string', default: 'reports', describe: 'Pasta de saída' })
.option('timeout', { type: 'number', default: 30000, describe: 'Timeout de carregamento (ms)' })
.option('max-links', { type: 'number', default: 25, describe: 'Limite de links para checagem de quebrados' })
.demandCommand(1)
.help()
.argv;


const targetUrl = argv._[0];


(async () => {
const result = await runAudit(targetUrl, { timeout: argv.timeout, maxLinksToCheck: argv['max-links'] });
const { jsonPath, base } = await writeJson(result, argv.out);
const mdPath = await writeMarkdown(result, argv.out, base);
console.log('✅ Auditoria concluída.');
console.log('JSON:', jsonPath);
console.log('MD :', mdPath);
})().catch(err => {
console.error('Erro na auditoria:', err);
process.exit(1);
});