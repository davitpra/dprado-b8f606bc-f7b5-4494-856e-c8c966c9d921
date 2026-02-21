import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Array of items for the current page' })
  items: T[];

  @ApiProperty({ example: 42, description: 'Total number of items matching the query' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 20, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 3, description: 'Total number of pages' })
  totalPages: number;

  constructor(items: T[], total: number, page: number, limit: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = Math.ceil(total / limit);
  }
}
