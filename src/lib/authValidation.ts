export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/
// 8자 이상 + 영문 최소 1개 포함 (숫자/기호 섞어도 됨, 상한은 bcrypt 기준 넉넉히 72자)
export const PASSWORD_RE = /^(?=.*[a-zA-Z]).{8,72}$/

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@reverxe.game`
}
