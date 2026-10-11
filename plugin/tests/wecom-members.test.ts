import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseWecomMembers } from '../src/wecom-members.ts'

/** 真源表格的样子（含反引号、说明列、表头与分隔行）。 */
const REAL_SHAPE = [
  '| 会话 id（`wecom-…`） | openid（`wo…`，备查） | 称呼 | 部门 / 角色 | 访问白名单 IP | 登记日期 | 备注 |',
  '|---|---|---|---|---|---|---|',
  '| `wecom-fdfa2da9dd1876b9` | `wouEkQEgAAC65V8BzR5U5OKSkLh2s4_g` | 刘少杰 | 创作者 | `10.8.53.128` | 2026-10-09 | 侧边栏标题 `企微·私聊-少杰` |',
  '| `wecom-2813558d6f3009e5` | `wouEkQEgAAuwYqcqBlLqJ--twmohmtgg` | 王浩 | 待补 | `10.8.52.14` | 2026-10-09 | — |',
  '',
  '> 表格外的说明文字不该被解析。',
  '| 会话 id | openid | 称呼 |',
].join('\n')

test('登记表里两种 id 都建索引', () => {
  const index = parseWecomMembers(REAL_SHAPE)
  assert.equal(index.bySession.get('wecom-fdfa2da9dd1876b9'), '刘少杰')
  assert.equal(index.bySession.get('wecom-2813558d6f3009e5'), '王浩')
  assert.equal(index.byOpenid.get('wouEkQEgAAC65V8BzR5U5OKSkLh2s4_g'), '刘少杰')
  assert.equal(index.byOpenid.get('wouEkQEgAAuwYqcqBlLqJ--twmohmtgg'), '王浩')
})

test('表头行、分隔行、表外文字、空表都不产生条目', () => {
  assert.equal(parseWecomMembers(REAL_SHAPE).bySession.size, 2)
  assert.equal(parseWecomMembers('').bySession.size, 0)
  assert.equal(parseWecomMembers(REAL_SHAPE.split('\n').slice(0, 2).join('\n')).bySession.size, 0)
})

test('不假设列序：id 与称呼换位置照样认得出', () => {
  const swapped = '| 称呼 | 会话 id | openid |\n|---|---|---|\n| 任璐 | `wecom-fed98dabb58b13fe` | `wouEkQEgAANo2RJEXiJY0F1h-OMoMcmA` |'
  const index = parseWecomMembers(swapped)
  assert.equal(index.bySession.get('wecom-fed98dabb58b13fe'), '任璐')
  assert.equal(index.byOpenid.get('wouEkQEgAANo2RJEXiJY0F1h-OMoMcmA'), '任璐')
})

test('只有 openid、没写会话 id 的行，仍能按 openid 查到', () => {
  const partial = '| openid | 称呼 |\n|---|---|\n| `wouEkQEgAAig1VfTKXUjPLcDE4FzF4LQ` | 苗 |'
  const index = parseWecomMembers(partial)
  assert.equal(index.byOpenid.get('wouEkQEgAAig1VfTKXUjPLcDE4FzF4LQ'), '苗')
  assert.equal(index.bySession.size, 0)
})
