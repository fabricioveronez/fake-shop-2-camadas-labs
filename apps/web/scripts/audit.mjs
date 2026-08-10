#!/usr/bin/env node
/**
 * `npm audit` com allowlist explícita.
 *
 * O `npm audit` não sabe aceitar um advisory específico: ou falha em tudo
 * acima de um nível, ou em nada. Isso empurra o projeto para
 * `--audit-level=critical`, que na prática desliga a verificação.
 *
 * Aqui cada exceção mora em `audit-allowlist.json` com o motivo por escrito e
 * a condição para removê-la. Qualquer advisory novo derruba o build.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BLOCKING = new Set(['high', 'critical'])

function runAudit() {
  try {
    return execFileSync('npm', ['audit', '--json'], { cwd: ROOT, encoding: 'utf8' })
  } catch (error) {
    // npm audit sai com código != 0 quando encontra algo. A saída ainda é
    // o JSON que queremos.
    if (error.stdout) return error.stdout
    throw error
  }
}

const report = JSON.parse(runAudit())
const allowlist = JSON.parse(readFileSync(resolve(ROOT, 'audit-allowlist.json'), 'utf8'))
const allowed = new Map(allowlist.allow.map((entry) => [entry.id, entry]))

const findings = []
for (const advisory of Object.values(report.vulnerabilities ?? {})) {
  if (!BLOCKING.has(advisory.severity)) continue

  for (const via of advisory.via) {
    if (typeof via === 'string') continue // dependência transitiva, já contada
    const id = via.url?.split('/').pop() ?? via.source
    findings.push({ id, package: via.name, title: via.title, severity: via.severity })
  }
}

const unexpected = findings.filter((finding) => !allowed.has(finding.id))
const accepted = findings.filter((finding) => allowed.has(finding.id))

for (const finding of accepted) {
  const entry = allowed.get(finding.id)
  console.log(`aceito  ${finding.id}  ${finding.package}  — ${entry.reason.split('.')[0]}.`)
}

if (unexpected.length === 0) {
  console.log(`\nOK: nenhum advisory high/critical fora da allowlist (${accepted.length} aceito(s)).`)
  process.exit(0)
}

console.error(`\n${unexpected.length} advisory(s) high/critical sem justificativa:\n`)
for (const finding of unexpected) {
  console.error(`  ${finding.severity.padEnd(8)} ${finding.id}  ${finding.package}`)
  console.error(`           ${finding.title}`)
}
console.error('\nAtualize a dependência ou registre a exceção em audit-allowlist.json.')
process.exit(1)
