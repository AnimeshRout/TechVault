/**
 * API Features — Filter, Sort, Paginate, Search
 * Chainable utility class for building MongoDB queries from URL query params.
 *
 * Usage:
 *   const features = new APIFeatures(Product.find(), req.query)
 *     .filter()
 *     .search()
 *     .sort()
 *     .limitFields()
 *     .paginate();
 *   const products = await features.query;
 */
class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  /**
   * FILTER: Remove special params and apply MongoDB operators
   * Converts gt, gte, lt, lte to $gt, $gte, $lt, $lte
   * Example: ?price[gte]=100&price[lte]=500&brand=Apple
   */
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search', 'q'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Handle category filter (can be comma-separated)
    if (queryObj.category) {
      queryObj.category = { $in: queryObj.category.split(',') };
    }

    // Handle brand filter (can be comma-separated)
    if (queryObj.brand) {
      queryObj.brand = { $in: queryObj.brand.split(',').map((b) => new RegExp(b, 'i')) };
    }

    // Handle rating filter
    if (queryObj.rating) {
      queryObj.rating = { $gte: Number(queryObj.rating) };
    }

    // Handle stock filter (inStock)
    if (queryObj.inStock === 'true') {
      queryObj.stock = { $gt: 0 };
      delete queryObj.inStock;
    }

    // Handle featured filter
    if (queryObj.isFeatured) {
      queryObj.isFeatured = queryObj.isFeatured === 'true';
    }

    // Convert operators: price[gte]=100 → price: { $gte: 100 }
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  /**
   * SEARCH: Full-text search using MongoDB text index
   * Example: ?search=macbook or ?q=iphone
   */
  search() {
    const searchTerm = this.queryString.search || this.queryString.q;
    if (searchTerm) {
      this.query = this.query.find({
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { brand: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
        ],
      });
    }
    return this;
  }

  /**
   * SORT: Order results by fields
   * Example: ?sort=-price,rating → sort by price desc, rating asc
   * Default: -createdAt (newest first)
   */
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }
    return this;
  }

  /**
   * LIMIT FIELDS: Select specific fields to return
   * Example: ?fields=title,price,brand → only return these fields
   */
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  /**
   * PAGINATE: Limit results per page
   * Example: ?page=2&limit=12
   * Default: page 1, 12 items per page
   */
  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 12;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    this.page = page;
    this.limit = limit;
    return this;
  }
}

export default APIFeatures;
