/**
 * 企微成员登记表 —— 把 `openid / 会话 id` 换成能称呼的名字。
 *
 * 真源：工作区 `参考/企微成员登记.md`（企微私聊第一次对话时 Jarvis 问出姓名后自己追加）。
 * 本模块**只读**它、不写；读不到就返回空表（标题回退到补丁3 的行为，不抛错）。
 *
 * 为什么按「会话 id」也能查：DSH 给每次 shell 调用注入 `DSH_SESSION_ID`，
 * 企微私聊里就是插件建的那条 `wecom-…` 会话 —— Jarvis 登记时用的就是它。
 */

import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** 登记表在工作区里的相对路径（真源，进 Git）。 */
export const WECOM_MEMBERS_RELATIVE_PATH = '参考/企微成员登记.md'

export interface WecomMemberIndex {
  /** 会话 id（`wecom-…`）→ 称呼。 */
  bySession: Map<string, string>
  /** openid（`wo…`）→ 称呼。 */
  byOpenid: Map<string, string>
}

const EMPTY: WecomMemberIndex = { bySession: new Map(), byOpenid: new Map() }

/** 单元格：去掉 Markdown 反引号与首尾空白。 */
function cell(value: string): string {
  return value.replaceAll('`', '').trim()
}

/** 分隔行（`|---|---|`）的单元格。 */
const SEPARATOR = /^-+$/

/**
 * 解析登记表正文。
 *
 * **不假设列序**：只看「哪一格长得像 id、哪一格是称呼」，所以人工加行、调列都不怕。
 * 表头行与分隔行会自动跳过（它们找不到 id，也找不到称呼）。
 */
export function parseWecomMembers(markdown: string): WecomMemberIndex {
  const bySession = new Map<string, string>()
  const byOpenid = new Map<string, string>()
  for (const line of markdown.split('\n')) {
    if (!line.trimStart().startsWith('|')) continue
    const cells = line.split('|').slice(1, -1).map(cell)
    if (cells.length < 2) continue
    const sessionId = cells.find((value) => value.startsWith('wecom-'))
    const openid = cells.find((value) => value.startsWith('wo'))
    const name = cells.find((value) =>
      value !== '' &&
      value !== '称呼' &&
      !value.startsWith('wecom-') &&
      !value.startsWith('wo') &&
      !SEPARATOR.test(value),
    )
    if (name === undefined) continue
    if (sessionId !== undefined) bySession.set(sessionId, name)
    if (openid !== undefined) byOpenid.set(openid, name)
  }
  return { bySession, byOpenid }
}

let cache: { path: string; mtimeMs: number; index: WecomMemberIndex } | undefined

/**
 * 按 mtime 缓存读取登记表。
 *
 * 文件不存在、读失败、表里没登记 —— 一律返回空表，**绝不影响标题生成**
 * （标题会回退显示开放 id，与补丁3 一致）。
 *
 * @param workspace - DSH 工作区根目录（插件配置 `workspace`）。
 */
export function loadWecomMembers(workspace: string): WecomMemberIndex {
  const path = join(workspace, WECOM_MEMBERS_RELATIVE_PATH)
  let mtimeMs: number
  try {
    mtimeMs = statSync(path).mtimeMs
  } catch {
    return EMPTY
  }
  if (cache !== undefined && cache.path === path && cache.mtimeMs === mtimeMs) return cache.index
  let index: WecomMemberIndex
  try {
    index = parseWecomMembers(readFileSync(path, 'utf8'))
  } catch {
    index = EMPTY
  }
  cache = { path, mtimeMs, index }
  return index
}
