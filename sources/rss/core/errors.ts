export class ParseError extends Error {
  constructor() {
    super('RSS parse is failed')
    this.name = 'ParseError'
  }
}
