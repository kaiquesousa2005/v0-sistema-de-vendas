import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    return hash
  } catch (error) {
    console.error('[v0] Error hashing password:', error)
    throw error
  }
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(password, hash)
    return isMatch
  } catch (error) {
    console.error('[v0] Error verifying password:', error)
    return false
  }
}
