import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { InvalidInputError, NotFoundError } from '../domain/aggregation';

@Catch(NotFoundError, InvalidInputError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    host
      .switchToHttp()
      .getResponse()
      .status(error instanceof NotFoundError ? 404 : 422)
      .json({ detail: error.message });
  }
}
