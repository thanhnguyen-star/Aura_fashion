const pool = require('../db');

const VALID_RANGES = new Set(['7d', 'this_month', 'last_month', 'this_year']);
const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

const RANGE_LABELS = {
  '7d': '7 ngày qua',
  this_month: 'Tháng này',
  last_month: 'Tháng trước',
  this_year: 'Năm nay',
};

/**
 * Lấy thông tin ngày/tháng/năm hiện tại theo múi giờ Asia/Ho_Chi_Minh
 */
function getNowInVietnam() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const map = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = Number(p.value);
  }
  return { year: map.year, month: map.month, day: map.day };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatIsoDate(y, m, d) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function formatShortDate(m, d) {
  return `${pad2(d)}/${pad2(m)}`;
}

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function addDays(y, m, d, delta) {
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  };
}

function prevYearMonth(y, m, step = 1) {
  let ny = y;
  let nm = m - step;
  while (nm <= 0) {
    ny -= 1;
    nm += 12;
  }
  return { year: ny, month: nm };
}

/**
 * Xây dựng khoảng thời gian kỳ này / kỳ trước và danh sách các điểm trục biểu đồ
 */
function buildPeriodConfig(rangeKey) {
  const range = VALID_RANGES.has(rangeKey) ? rangeKey : '7d';
  const now = getNowInVietnam();

  if (range === '7d') {
    const curStart = addDays(now.year, now.month, now.day, -6);
    const prevStart = addDays(now.year, now.month, now.day, -13);
    const prevEnd = addDays(now.year, now.month, now.day, -7);

    const buckets = [];
    for (let i = 0; i < 7; i += 1) {
      const c = addDays(curStart.year, curStart.month, curStart.day, i);
      const p = addDays(prevStart.year, prevStart.month, prevStart.day, i);
      buckets.push({
        label: `Ngày ${i + 1}`,
        currentKey: formatIsoDate(c.year, c.month, c.day),
        previousKey: formatIsoDate(p.year, p.month, p.day),
        currentDateLabel: formatShortDate(c.month, c.day),
        previousDateLabel: formatShortDate(p.month, p.day),
      });
    }

    return {
      range,
      rangeLabel: RANGE_LABELS[range],
      granularity: 'day',
      currentStartSql: `${formatIsoDate(curStart.year, curStart.month, curStart.day)} 00:00:00`,
      currentEndSql: `${formatIsoDate(now.year, now.month, now.day)} 23:59:59`,
      previousStartSql: `${formatIsoDate(prevStart.year, prevStart.month, prevStart.day)} 00:00:00`,
      previousEndSql: `${formatIsoDate(prevEnd.year, prevEnd.month, prevEnd.day)} 23:59:59`,
      currentPeriodLabel: `${formatShortDate(curStart.month, curStart.day)} – ${formatShortDate(now.month, now.day)}`,
      previousPeriodLabel: `${formatShortDate(prevStart.month, prevStart.day)} – ${formatShortDate(prevEnd.month, prevEnd.day)}`,
      buckets,
    };
  }

  if (range === 'this_month') {
    const prevYM = prevYearMonth(now.year, now.month, 1);
    const prevMaxDay = Math.min(now.day, daysInMonth(prevYM.year, prevYM.month));

    const buckets = [];
    for (let d = 1; d <= now.day; d += 1) {
      const hasPrevDay = d <= prevMaxDay;
      buckets.push({
        label: `Ngày ${d}`,
        currentKey: formatIsoDate(now.year, now.month, d),
        previousKey: hasPrevDay ? formatIsoDate(prevYM.year, prevYM.month, d) : null,
        currentDateLabel: formatShortDate(now.month, d),
        previousDateLabel: hasPrevDay ? formatShortDate(prevYM.month, d) : null,
      });
    }

    return {
      range,
      rangeLabel: RANGE_LABELS[range],
      granularity: 'day',
      currentStartSql: `${formatIsoDate(now.year, now.month, 1)} 00:00:00`,
      currentEndSql: `${formatIsoDate(now.year, now.month, now.day)} 23:59:59`,
      previousStartSql: `${formatIsoDate(prevYM.year, prevYM.month, 1)} 00:00:00`,
      previousEndSql: `${formatIsoDate(prevYM.year, prevYM.month, prevMaxDay)} 23:59:59`,
      currentPeriodLabel: `${formatShortDate(now.month, 1)} – ${formatShortDate(now.month, now.day)}`,
      previousPeriodLabel: `${formatShortDate(prevYM.month, 1)} – ${formatShortDate(prevYM.month, prevMaxDay)}`,
      buckets,
    };
  }

  if (range === 'last_month') {
    const curYM = prevYearMonth(now.year, now.month, 1);
    const prevYM = prevYearMonth(now.year, now.month, 2);
    const curDays = daysInMonth(curYM.year, curYM.month);
    const prevDays = daysInMonth(prevYM.year, prevYM.month);
    const totalBuckets = Math.max(curDays, prevDays);

    const buckets = [];
    for (let d = 1; d <= totalBuckets; d += 1) {
      const hasCur = d <= curDays;
      const hasPrev = d <= prevDays;
      buckets.push({
        label: `Ngày ${d}`,
        currentKey: hasCur ? formatIsoDate(curYM.year, curYM.month, d) : null,
        previousKey: hasPrev ? formatIsoDate(prevYM.year, prevYM.month, d) : null,
        currentDateLabel: hasCur ? formatShortDate(curYM.month, d) : null,
        previousDateLabel: hasPrev ? formatShortDate(prevYM.month, d) : null,
      });
    }

    return {
      range,
      rangeLabel: RANGE_LABELS[range],
      granularity: 'day',
      currentStartSql: `${formatIsoDate(curYM.year, curYM.month, 1)} 00:00:00`,
      currentEndSql: `${formatIsoDate(curYM.year, curYM.month, curDays)} 23:59:59`,
      previousStartSql: `${formatIsoDate(prevYM.year, prevYM.month, 1)} 00:00:00`,
      previousEndSql: `${formatIsoDate(prevYM.year, prevYM.month, prevDays)} 23:59:59`,
      currentPeriodLabel: `Tháng ${pad2(curYM.month)}/${curYM.year}`,
      previousPeriodLabel: `Tháng ${pad2(prevYM.month)}/${prevYM.year}`,
      buckets,
    };
  }

  // range === 'this_year' (gom theo tháng, so sánh YTD cùng kỳ năm trước)
  const prevYear = now.year - 1;
  const prevEndDay = Math.min(now.day, daysInMonth(prevYear, now.month));

  const buckets = [];
  for (let m = 1; m <= now.month; m += 1) {
    buckets.push({
      label: `Tháng ${m}`,
      currentKey: `${now.year}-${pad2(m)}`,
      previousKey: `${prevYear}-${pad2(m)}`,
      currentDateLabel: `T${m}/${now.year}`,
      previousDateLabel: `T${m}/${prevYear}`,
    });
  }

  return {
    range,
    rangeLabel: RANGE_LABELS[range],
    granularity: 'month',
    currentStartSql: `${now.year}-01-01 00:00:00`,
    currentEndSql: `${formatIsoDate(now.year, now.month, now.day)} 23:59:59`,
    previousStartSql: `${prevYear}-01-01 00:00:00`,
    previousEndSql: `${formatIsoDate(prevYear, now.month, prevEndDay)} 23:59:59`,
    currentPeriodLabel: `01/01 – ${formatShortDate(now.month, now.day)}/${now.year}`,
    previousPeriodLabel: `01/01 – ${formatShortDate(now.month, prevEndDay)}/${prevYear}`,
    buckets,
  };
}

/**
 * Tính % tăng/giảm so với kỳ trước
 * Quy tắc: kỳ trước = 0 và kỳ này > 0 -> "Mới"
 */
function computeGrowth(current, previous) {
  if (previous === 0) {
    if (current > 0) {
      return { status: 'new', percent: null, label: 'Mới' };
    }
    return { status: 'neutral', percent: 0, label: '0%' };
  }

  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  const status = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'neutral';
  const formattedPct = new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(rounded));
  const prefix = rounded > 0 ? '+' : rounded < 0 ? '-' : '';

  return {
    status,
    percent: rounded,
    label: `${prefix}${formattedPct}%`,
  };
}

async function getDashboard(req, res) {
  try {
    const period = buildPeriodConfig(req.query.range);
    const groupExpr =
      period.granularity === 'month'
        ? "DATE_FORMAT(NgayDat, '%Y-%m')"
        : "DATE_FORMAT(NgayDat, '%Y-%m-%d')";

    // 1. KPI kỳ này & kỳ trước (LOẠI toàn bộ đơn HUY trong SQL)
    const periodKpiSql = `
      SELECT
        COALESCE(SUM(TongThanhToan), 0) AS revenue,
        COUNT(*) AS orders
      FROM DonHang
      WHERE TrangThai <> 'HUY'
        AND NgayDat >= ?
        AND NgayDat <= ?
    `;

    // 2. Đơn chờ xác nhận hiện có (toàn hệ thống, khớp khi bấm sang trang Đơn hàng)
    const pendingSql = `
      SELECT COUNT(*) AS pendingOrders
      FROM DonHang
      WHERE TrangThai = 'CHO_XAC_NHAN'
    `;

    // 3. Dữ liệu chuỗi thời gian theo múi giờ Asia/Ho_Chi_Minh (LOẠI đơn HUY)
    const seriesSql = `
      SELECT
        ${groupExpr} AS bucketKey,
        COALESCE(SUM(TongThanhToan), 0) AS revenue,
        COUNT(*) AS orders
      FROM DonHang
      WHERE TrangThai <> 'HUY'
        AND NgayDat >= ?
        AND NgayDat <= ?
      GROUP BY ${groupExpr}
      ORDER BY bucketKey ASC
    `;

    // 4. Cơ cấu doanh thu theo Danh mục (LOẠI đơn HUY)
    const categorySql = `
      SELECT
        COALESCE(dm.MaDanhMuc, 0) AS categoryId,
        COALESCE(dm.TenDanhMuc, 'Khác') AS categoryName,
        COALESCE(SUM(ct.ThanhTien), 0) AS revenue
      FROM ChiTietDonHang ct
      INNER JOIN DonHang dh ON dh.MaDonHang = ct.MaDonHang
      LEFT JOIN BienTheSanPham bt ON bt.MaBienThe = ct.MaBienThe
      LEFT JOIN SanPham sp ON sp.MaSanPham = bt.MaSanPham
      LEFT JOIN DanhMuc dm ON dm.MaDanhMuc = sp.MaDanhMuc
      WHERE dh.TrangThai <> 'HUY'
        AND dh.NgayDat >= ?
        AND dh.NgayDat <= ?
      GROUP BY COALESCE(dm.MaDanhMuc, 0), COALESCE(dm.TenDanhMuc, 'Khác')
      HAVING revenue > 0
      ORDER BY revenue DESC
    `;

    const [
      [[curKpi]],
      [[prevKpi]],
      [[pendingRow]],
      [curSeriesRows],
      [prevSeriesRows],
      [categoryRows],
    ] = await Promise.all([
      pool.query(periodKpiSql, [period.currentStartSql, period.currentEndSql]),
      pool.query(periodKpiSql, [period.previousStartSql, period.previousEndSql]),
      pool.query(pendingSql),
      pool.query(seriesSql, [period.currentStartSql, period.currentEndSql]),
      pool.query(seriesSql, [period.previousStartSql, period.previousEndSql]),
      pool.query(categorySql, [period.currentStartSql, period.currentEndSql]),
    ]);

    const curRevenue = Number(curKpi.revenue) || 0;
    const curOrders = Number(curKpi.orders) || 0;
    const curAov = curOrders > 0 ? Math.round(curRevenue / curOrders) : 0;

    const prevRevenue = Number(prevKpi.revenue) || 0;
    const prevOrders = Number(prevKpi.orders) || 0;
    const prevAov = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;

    const curMap = new Map(curSeriesRows.map((r) => [r.bucketKey, Number(r.revenue) || 0]));
    const prevMap = new Map(prevSeriesRows.map((r) => [r.bucketKey, Number(r.revenue) || 0]));

    const revenueSeries = period.buckets.map((b) => ({
      label: b.label,
      currentRevenue: b.currentKey !== null ? curMap.get(b.currentKey) ?? 0 : null,
      previousRevenue: b.previousKey !== null ? prevMap.get(b.previousKey) ?? 0 : null,
      currentDateLabel: b.currentDateLabel,
      previousDateLabel: b.previousDateLabel,
    }));

    // Tối đa 5 lát danh mục + gộp phần còn lại vào "Khác"
    const normalizedCats = categoryRows.map((c) => ({
      categoryId: Number(c.categoryId),
      name: c.categoryName || 'Khác',
      value: Number(c.revenue) || 0,
    }));

    const topCats = [];
    let otherValue = 0;
    for (const cat of normalizedCats) {
      if (cat.name === 'Khác') {
        otherValue += cat.value;
      } else if (topCats.length < 5) {
        topCats.push(cat);
      } else {
        otherValue += cat.value;
      }
    }
    if (otherValue > 0) {
      topCats.push({ categoryId: 0, name: 'Khác', value: otherValue });
    }

    const categoryTotal = topCats.reduce((sum, item) => sum + item.value, 0);
    const categoryBreakdown = topCats.map((item) => ({
      ...item,
      percentage: categoryTotal > 0 ? Math.round((item.value / categoryTotal) * 1000) / 10 : 0,
    }));

    res.json({
      success: true,
      range: period.range,
      rangeLabel: period.rangeLabel,
      granularity: period.granularity,
      timezone: VN_TIMEZONE,
      periodMeta: {
        currentLabel: period.currentPeriodLabel,
        previousLabel: period.previousPeriodLabel,
      },
      kpis: {
        revenue: {
          current: curRevenue,
          previous: prevRevenue,
          growth: computeGrowth(curRevenue, prevRevenue),
        },
        orders: {
          current: curOrders,
          previous: prevOrders,
          diff: curOrders - prevOrders,
          growth: computeGrowth(curOrders, prevOrders),
        },
        aov: {
          current: curAov,
          previous: prevAov,
          growth: computeGrowth(curAov, prevAov),
        },
        pendingOrders: Number(pendingRow.pendingOrders) || 0,
      },
      revenueSeries,
      categoryBreakdown: {
        total: categoryTotal,
        items: categoryBreakdown,
      },
    });
  } catch (err) {
    console.error('[dashboard.controller > getDashboard]', err);
    res.status(500).json({
      success: false,
      error: 'Lỗi lấy dữ liệu thống kê: ' + err.message,
    });
  }
}

module.exports = { getDashboard };
