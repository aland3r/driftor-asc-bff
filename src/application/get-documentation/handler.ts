import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock, DOCUMENTATION, DocumentationSource } from '../ports';

const TTL_MS = 10 * 60 * 1000;

/** arc42 em Markdown, lido do repositório de documentação e guardado por 10 minutos. */
@Injectable()
export class GetDocumentationHandler {
  private cache: { at: number; text: string } | null = null;

  constructor(
    @Inject(DOCUMENTATION) private readonly source: DocumentationSource,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async handle(): Promise<string> {
    const now = this.clock.now();
    if (this.cache && now - this.cache.at < TTL_MS) return this.cache.text;
    try {
      const text = await this.source.arc42();
      this.cache = { at: now, text };
      return text;
    } catch (err) {
      if (this.cache) return this.cache.text;
      throw err;
    }
  }
}
