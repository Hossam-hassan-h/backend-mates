// Helper to format WhatsApp order message for Mates Store
exports.buildWhatsAppMessage = (order, whatsappNumber) => {
  let msg = `*طلب جديد من Mates Store* 🛍️\n`;
  msg += `*رقم الطلب:* ${order.orderNumber}\n`;
  msg += `*اسم العميل:* ${order.customer.name}\n`;
  msg += `*الهاتف:* ${order.customer.phone}\n`;
  msg += `*العنوان:* ${order.customer.address}\n\n`;
  msg += `*القطع المطلوبة:*\n`;

  order.items.forEach((item, idx) => {
    const pName = item.productName?.ar || item.productName?.en || 'قطعة ملابس';
    const size = item.sizeSnapshot ? ` (مقاس: ${item.sizeSnapshot})` : '';
    const color = item.colorSnapshot?.name?.ar || item.colorSnapshot?.name?.en;
    const colorStr = color ? ` (لون: ${color})` : '';
    const unitEgp = (item.unitPrice / 100).toFixed(2);
    const itemTotalEgp = (item.totalPrice / 100).toFixed(2);
    msg += `${idx + 1}. ${pName}${size}${colorStr} x${item.quantity} - ${unitEgp} ج.م (الإجمالي: ${itemTotalEgp} ج.م)\n`;
  });

  const subtotalEgp = (order.subtotal / 100).toFixed(2);
  const totalEgp = (order.total / 100).toFixed(2);

  msg += `\n*المجموع الفرعي:* ${subtotalEgp} ج.م\n`;
  if (order.pointsRedeemed > 0) {
    const discountEgp = (order.pointsRedeemed / 100).toFixed(2);
    msg += `*خصم نقاط الولاء:* -${discountEgp} ج.م (${order.pointsRedeemed} قرش)\n`;
  }
  msg += `*الإجمالي النهائي المطلوب:* ${totalEgp} ج.م\n`;
  const earnedEgp = (order.pointsEarned / 100).toFixed(2);
  msg += `*النقاط المكتسبة من هذا الطلب:* ${earnedEgp} ج.م رصيد نقاط 🎁\n`;
  msg += `*تاريخ الطلب:* ${new Date(order.orderDate).toLocaleDateString('ar-EG')}\n`;

  const cleanDigits = String(whatsappNumber).replace(/\D/g, '');
  return `https://wa.me/${cleanDigits}?text=${encodeURIComponent(msg)}`;
};
