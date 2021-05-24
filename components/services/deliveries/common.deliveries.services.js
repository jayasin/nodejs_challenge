import Deliveries from '@/models/Deliveries.model';

const find = async (req) => {
  // some vars
  let query = {};
  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  let sort = { _id: 1 }

  // if date provided, filter by date
  if (req.body.when) {
    query['when'] = {
      '$gte': req.body.when
    }
  };

  let totalResults = await Deliveries.find(query).countDocuments();

  if (totalResults < 1) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find any delivery`
      }
    }
  }

  let deliveries = await Deliveries.find(query).skip(skip).sort(sort).limit(limit);

  return {
    totalResults: totalResults,
    deliveries
  }
}

const create = async (req) => {
  try {
    await Deliveries.create(req.body);
  } catch (e) {
    throw {
      code: 400,
      data: {
        message: `An error has occurred trying to create the delivery:
          ${JSON.stringify(e, null, 2)}`
      }
    }
  }
}

const findOne = async (req) => {
  let delivery = await Deliveries.findOne({_id: req.body.id});
  if (!delivery) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find a delivery with the sent ID`
      }
    }
  }
  return delivery;
}

const deliveriesFilter = async (req) => {
  /* Filter Parameters */
  const limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  const skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  const weight = parseInt(req.body.weight);
  const dateFrom = new Date(req.body.dateFrom);
  const dateTo = new Date(req.body.dateTo);

  /* Query to fetch the total deliveries */
  const queryWithoutLimit = [{
    $lookup: {
      from: "products",
      localField: "products",
      foreignField: "_id",
      as: "products",
    },
  },
  {
    $match: {
      when: {
        $gte: dateFrom,
        $lt: dateTo,
      },
      products: { $elemMatch: { weight: { $gte: weight } } },
    },
  }
]

/* Query to fetch the deliveries with limit & pagination */
  const queryWithLimit = [{
    $lookup: {
      from: "products",
      localField: "products",
      foreignField: "_id",
      as: "products",
    },
  },
  {
    $match: {
      when: {
        $gte: dateFrom,
        $lt: dateTo,
      },
      products: { $elemMatch: { weight: { $gte: weight } } },
    },
  },
  { $sort: { '_id': 1 } },
  { $skip: skip },
  { $limit: limit },
];

const countResult = await Deliveries.aggregate(queryWithoutLimit).allowDiskUse(true);

if(countResult.length) {
  const queryResult = await Deliveries.aggregate(queryWithLimit).allowDiskUse(true);
  return { totalResults: countResult.length , deliveries: queryResult}
} else {
  throw {
    code: 404,
    data: {
      message: `We couldn't find a delivery for the provided filters`
    }
  }
}

}

export default {
  find,
  create,
  findOne,
  deliveriesFilter
}
