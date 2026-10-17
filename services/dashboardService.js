const asyncHandler = require('express-async-handler');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const Variant = require('../models/variantModel');
const Customer = require('../models/customerModel');
const Category = require('../models/categoryModel');

// Helper to format Date to Day Name in Arabic
const getArabicDayName = (date) => {
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[date.getDay()];
};

// Helper to format Date to DD/MM
const formatDateDM = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
};

// Helper to compute date range boundaries and previous comparison period
const getDateRangeBounds = (range = 'last7Days', customStart = null, customEnd = null) => {
  const now = new Date();
  let start = null;
  let end = null;
  let prevStart = null;
  let prevEnd = null;
  let bucketType = 'day';

  switch (range) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 1);
      prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 1);

      bucketType = 'hour';
      break;
    }
    case 'yesterday': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 1);
      prevEnd = new Date(end);
      prevEnd.setDate(prevEnd.getDate() - 1);

      bucketType = 'hour';
      break;
    }
    case 'last7Days': {
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);

      const spanMs = end.getTime() - start.getTime() + 1;
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - spanMs + 1);

      bucketType = 'day';
      break;
    }
    case 'last30Days': {
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);

      const spanMs = end.getTime() - start.getTime() + 1;
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - spanMs + 1);

      bucketType = 'day';
      break;
    }
    case 'thisMonth': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      bucketType = 'day';
      break;
    }
    case 'thisYear': {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

      prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

      bucketType = 'month';
      break;
    }
    case 'allTime': {
      start = new Date(0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      prevStart = null;
      prevEnd = null;

      bucketType = 'month';
      break;
    }
    case 'custom': {
      const parsedStart = customStart ? new Date(customStart) : new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      const parsedEnd = customEnd ? new Date(customEnd) : new Date();

      start = new Date(parsedStart.getFullYear(), parsedStart.getMonth(), parsedStart.getDate(), 0, 0, 0, 0);
      end = new Date(parsedEnd.getFullYear(), parsedEnd.getMonth(), parsedEnd.getDate(), 23, 59, 59, 999);

      const spanMs = Math.max(end.getTime() - start.getTime() + 1, 1);
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - spanMs + 1);

      const diffDays = Math.ceil(spanMs / (24 * 60 * 60 * 1000));
      if (diffDays <= 2) bucketType = 'hour';
      else if (diffDays <= 60) bucketType = 'day';
      else bucketType = 'month';
      break;
    }
    default: {
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);

      const spanMs = end.getTime() - start.getTime() + 1;
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - spanMs + 1);

      bucketType = 'day';
      break;
    }
  }

  return { start, end, prevStart, prevEnd, bucketType };
};

// Helper to format growth rate with sign
const formatGrowth = (current, previous) => {
  if (previous === null || previous === undefined) return '0.0%';
  if (previous === 0) {
    return current > 0 ? '+100.0%' : '0.0%';
  }
  const diff = current - previous;
  const percentage = ((diff / previous) * 100).toFixed(1);
  return `${diff >= 0 ? '+' : ''}${percentage}%`;
};

// @desc    Get Admin Dashboard Stats
// @route   GET /api/v1/admin/dashboard/stats
// @access  Private/Admin-Manager
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const range = req.query.range || 'last7Days';
  const customStart = req.query.startDate;
  const customEnd = req.query.endDate;

  const { start, end, prevStart, prevEnd, bucketType } = getDateRangeBounds(range, customStart, customEnd);

  // 1. Inventory & Catalog Metrics
  const [
    totalProducts,
    totalCategories,
    totalVariants,
    productsOutOfStock,
    lowStockProducts,
  ] = await Promise.all([
    Product.countDocuments(),
    Category.countDocuments(),
    Variant.countDocuments(),
    Variant.countDocuments({ stockQuantity: 0 }),
    Variant.countDocuments({ stockQuantity: { $gt: 0, $lte: 5 } }),
  ]);

  // 2. Customers count
  const [totalCustomers, prevCustomers] = await Promise.all([
    Customer.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    prevStart && prevEnd
      ? Customer.countDocuments({ createdAt: { $gte: prevStart, $lte: prevEnd } })
      : Promise.resolve(null),
  ]);

  const customersGrowth = formatGrowth(totalCustomers, prevCustomers);

  // 3. Orders and Revenue
  const orderFilter = {
    status: { $ne: 'cancelled' },
    createdAt: { $gte: start, $lte: end },
  };

  const orders = await Order.find(orderFilter);
  const totalOrders = orders.length;

  let totalSales = 0;
  let totalSoldItems = 0;

  orders.forEach((o) => {
    // Total in piastres -> convert to EGP for display
    const orderEgp = o.total !== undefined ? o.total / 100 : (o.finalTotal || o.totalOrderPrice || 0);
    totalSales += orderEgp;

    if (o.items && o.items.length > 0) {
      o.items.forEach((it) => {
        totalSoldItems += it.quantity || 0;
      });
    }
  });

  let prevSales = 0;
  let prevOrders = 0;
  if (prevStart && prevEnd) {
    const prevOrderList = await Order.find({
      status: { $ne: 'cancelled' },
      createdAt: { $gte: prevStart, $lte: prevEnd },
    });
    prevOrders = prevOrderList.length;
    prevOrderList.forEach((o) => {
      const orderEgp = o.total !== undefined ? o.total / 100 : (o.finalTotal || o.totalOrderPrice || 0);
      prevSales += orderEgp;
    });
  }

  const salesGrowth = formatGrowth(totalSales, prevStart ? prevSales : null);
  const ordersGrowth = formatGrowth(totalOrders, prevStart ? prevOrders : null);

  // 4. Fixed Revenue Sub-Ranges
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const [todayOrders, weekOrders, monthOrders] = await Promise.all([
    Order.find({ status: { $ne: 'cancelled' }, createdAt: { $gte: todayStart } }),
    Order.find({ status: { $ne: 'cancelled' }, createdAt: { $gte: weekStart } }),
    Order.find({ status: { $ne: 'cancelled' }, createdAt: { $gte: monthStart } }),
  ]);

  const calcEgpSum = (list) =>
    list.reduce((sum, o) => sum + (o.total !== undefined ? o.total / 100 : (o.finalTotal || 0)), 0);

  const revenueToday = calcEgpSum(todayOrders);
  const revenueThisWeek = calcEgpSum(weekOrders);
  const revenueThisMonth = calcEgpSum(monthOrders);

  // 5. Order Status Distribution
  const statusCounts = {
    pending: 0,
    preparing: 0,
    out_for_delivery: 0,
    completed: 0,
    cancelled: 0,
  };

  const allRangeOrders = await Order.find({ createdAt: { $gte: start, $lte: end } });
  allRangeOrders.forEach((o) => {
    const st = o.status || o.orderStatus;
    if (statusCounts[st] !== undefined) {
      statusCounts[st] += 1;
    }
  });

  const orderStatusDistribution = [
    { name: 'قيد الانتظار', value: statusCounts.pending, color: '#f59e0b' },
    { name: 'جاري التجهيز', value: statusCounts.preparing, color: '#8b5cf6' },
    { name: 'خارج للتوصيل', value: statusCounts.out_for_delivery, color: '#06b6d4' },
    { name: 'مكتملة', value: statusCounts.completed, color: '#10b981' },
    { name: 'ملغاة', value: statusCounts.cancelled, color: '#ef4444' },
  ];

  // 6. Sales Overview Chart
  let salesOverview = [];
  if (bucketType === 'hour') {
    salesOverview = Array.from({ length: 24 }, (_, hour) => {
      const bStart = new Date(start);
      bStart.setHours(hour, 0, 0, 0);
      const bEnd = new Date(start);
      bEnd.setHours(hour, 59, 59, 999);

      const label = `${String(hour).padStart(2, '0')}:00`;
      const bucketOrders = orders.filter((o) => o.createdAt >= bStart && o.createdAt <= bEnd);
      const bucketSales = calcEgpSum(bucketOrders);

      return {
        date: label,
        sales: Number(bucketSales.toFixed(2)),
        orders: bucketOrders.length,
      };
    });
  } else {
    const dayBuckets = [];
    const curr = new Date(start);
    while (curr <= end && dayBuckets.length < 60) {
      const dayStart = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 0, 0, 0, 0);
      const dayEnd = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate(), 23, 59, 59, 999);

      const label = range === 'last7Days' ? getArabicDayName(curr) : formatDateDM(curr);
      const bucketOrders = orders.filter((o) => o.createdAt >= dayStart && o.createdAt <= dayEnd);
      const bucketSales = calcEgpSum(bucketOrders);

      dayBuckets.push({
        date: label,
        sales: Number(bucketSales.toFixed(2)),
        orders: bucketOrders.length,
      });

      curr.setDate(curr.getDate() + 1);
    }
    salesOverview = dayBuckets;
  }

  // 7. Recent activities
  const latestOrders = await Order.find()
    .sort({ createdAt: -1 })
    .limit(5);

  const latestCustomers = await Customer.find()
    .sort({ createdAt: -1 })
    .limit(5);

  const latestProducts = await Product.find()
    .sort({ createdAt: -1 })
    .limit(5);

  res.status(200).json({
    success: true,
    data: {
      totalProducts,
      totalCategories,
      totalVariants,
      totalDiscountedProducts: 0,
      productsOutOfStock,
      lowStockProducts,
      totalCustomers,
      totalOrders,
      totalSales: Number(totalSales.toFixed(2)),
      revenueToday: Number(revenueToday.toFixed(2)),
      revenueThisWeek: Number(revenueThisWeek.toFixed(2)),
      revenueThisMonth: Number(revenueThisMonth.toFixed(2)),
      totalSoldItems,
      customersGrowth,
      salesGrowth,
      ordersGrowth,
      orderStatusDistribution,
      salesOverview,
      topSellingProducts: [],
      latestOrders,
      latestCustomers,
      latestProducts,
    },
  });
});
