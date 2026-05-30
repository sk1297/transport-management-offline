import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.js'

const FEATURES = [
  {
    section: { en: 'Operations', hi: 'संचालन', mr: 'कार्यचालन' },
    items: [
      {
        icon: '🚛', color: '#3b82f6',
        en: { title: 'Trips', desc: 'Create and manage trips. Add LR/Bilty, track milestones, set freight amounts, driver bata, advance paid. Use profit estimator to plan margins before starting a trip.' },
        hi: { title: 'ट्रिप', desc: 'ट्रिप बनाएं और प्रबंधित करें। एलआर/बिल्टी जोड़ें, पड़ाव ट्रैक करें, माल भाड़ा, ड्राइवर भत्ता, अग्रिम भुगतान सेट करें। ट्रिप शुरू करने से पहले लाभ अनुमानक से योजना बनाएं।' },
        mr: { title: 'ट्रिप', desc: 'ट्रिप तयार करा आणि व्यवस्थापित करा. एलआर/बिल्टी जोडा, टप्पे ट्रॅक करा, माल भाडे, चालक भत्ता, आगाऊ रक्कम सेट करा. ट्रिप सुरू करण्यापूर्वी नफा अंदाजक वापरा.' },
      },
      {
        icon: '🚗', color: '#10b981',
        en: { title: 'Vehicles', desc: 'Add vehicles with registration, insurance, PUC, fitness, national & state permit details. Get automatic expiry alerts on dashboard. Track KM logs and documents.' },
        hi: { title: 'वाहन', desc: 'पंजीकरण, बीमा, पीयूसी, फिटनेस, राष्ट्रीय और राज्य परमिट विवरण के साथ वाहन जोड़ें। डैशबोर्ड पर स्वचालित समाप्ति अलर्ट पाएं। किमी लॉग और दस्तावेज़ ट्रैक करें।' },
        mr: { title: 'वाहने', desc: 'नोंदणी, विमा, पीयूसी, फिटनेस, राष्ट्रीय आणि राज्य परवाना तपशीलांसह वाहने जोडा. डॅशबोर्डवर स्वयंचलित समाप्ती सूचना मिळवा. किमी नोंदी आणि कागदपत्रे ट्रॅक करा.' },
      },
      {
        icon: '👤', color: '#8b5cf6',
        en: { title: 'Drivers', desc: 'Manage driver profiles, license, medical, badge expiry alerts. Mark daily attendance (Present/Absent/Half Day/Leave). View public holidays. Process monthly salary and advances.' },
        hi: { title: 'ड्राइवर', desc: 'ड्राइवर प्रोफाइल, लाइसेंस, मेडिकल, बैज समाप्ति अलर्ट प्रबंधित करें। दैनिक उपस्थिति चिन्हित करें। सार्वजनिक छुट्टियां देखें। मासिक वेतन और अग्रिम प्रक्रिया करें।' },
        mr: { title: 'चालक', desc: 'चालक प्रोफाइल, परवाना, वैद्यकीय, बॅज समाप्ती सूचना व्यवस्थापित करा. दैनिक उपस्थिती नोंदवा. सार्वजनिक सुट्ट्या पाहा. मासिक पगार आणि आगाऊ प्रक्रिया करा.' },
      },
      {
        icon: '📅', color: '#f59e0b',
        en: { title: 'Driver Roster', desc: 'Plan monthly driver schedules on a calendar. Assign drivers to vehicles for each day. View color-coded monthly summary per driver.' },
        hi: { title: 'ड्राइवर रोस्टर', desc: 'कैलेंडर पर मासिक ड्राइवर कार्यक्रम बनाएं। प्रतिदिन वाहनों में ड्राइवर नियुक्त करें। प्रत्येक ड्राइवर का रंग-कोडित मासिक सारांश देखें।' },
        mr: { title: 'चालक रोस्टर', desc: 'कॅलेंडरवर मासिक चालक वेळापत्रक तयार करा. दररोज वाहनांमध्ये चालक नियुक्त करा. प्रत्येक चालकाचे रंग-कोडित मासिक सारांश पाहा.' },
      },
      {
        icon: '⛽', color: '#ef4444',
        en: { title: 'Diesel & Toll', desc: 'Log every diesel fill-up (litres, rate, KM reading, pump name) and toll payments. All linked to trips for accurate expense tracking.' },
        hi: { title: 'डीजल और टोल', desc: 'हर डीजल भरने की जानकारी (लीटर, दर, किमी रीडिंग, पंप का नाम) और टोल भुगतान लॉग करें। सटीक व्यय ट्रैकिंग के लिए ट्रिप से जोड़ें।' },
        mr: { title: 'डिझेल आणि टोल', desc: 'प्रत्येक डिझेल भरण्याची माहिती (लिटर, दर, किमी वाचन, पंप नाव) आणि टोल भरणे नोंदवा. अचूक खर्च ट्रॅकिंगसाठी ट्रिपशी जोडा.' },
      },
      {
        icon: '📊', color: '#06b6d4',
        en: { title: 'Fuel Efficiency', desc: 'Automatically calculates KM per litre for each vehicle from diesel logs. View bar charts per fill-up and track efficiency trends.' },
        hi: { title: 'ईंधन दक्षता', desc: 'डीजल लॉग से प्रत्येक वाहन के लिए प्रति लीटर किमी स्वचालित रूप से गणना करता है। प्रत्येक भरने के लिए बार चार्ट देखें और दक्षता रुझान ट्रैक करें।' },
        mr: { title: 'इंधन कार्यक्षमता', desc: 'डिझेल नोंदींमधून प्रत्येक वाहनासाठी किमी प्रति लिटर आपोआप मोजतो. प्रत्येक भरण्यासाठी बार चार्ट पाहा आणि कार्यक्षमता ट्रेंड ट्रॅक करा.' },
      },
    ]
  },
  {
    section: { en: 'Finance', hi: 'वित्त', mr: 'वित्त' },
    items: [
      {
        icon: '💸', color: '#10b981',
        en: { title: 'Expenses', desc: 'Record all business expenses by category. View monthly breakdowns and totals. Filter by date range.' },
        hi: { title: 'व्यय', desc: 'श्रेणी के अनुसार सभी व्यावसायिक व्यय दर्ज करें। मासिक विवरण और कुल देखें। तिथि सीमा के अनुसार फ़िल्टर करें।' },
        mr: { title: 'खर्च', desc: 'श्रेणीनुसार सर्व व्यावसायिक खर्च नोंदवा. मासिक तपशील आणि एकूण पाहा. तारीख श्रेणीनुसार फिल्टर करा.' },
      },
      {
        icon: '🧾', color: '#3b82f6',
        en: { title: 'Invoices', desc: 'Create GST invoices for customers. Add line items, apply taxes and discounts. Mark payments received. Track outstanding amounts.' },
        hi: { title: 'चालान', desc: 'ग्राहकों के लिए जीएसटी चालान बनाएं। लाइन आइटम जोड़ें, कर और छूट लागू करें। प्राप्त भुगतान चिन्हित करें। बकाया राशि ट्रैक करें।' },
        mr: { title: 'बीजके', desc: 'ग्राहकांसाठी जीएसटी बीजके तयार करा. लाइन आयटम जोडा, कर आणि सवलत लागू करा. मिळालेले भरणे चिन्हांकित करा. थकबाकी रक्कम ट्रॅक करा.' },
      },
      {
        icon: '📋', color: '#f59e0b',
        en: { title: 'Accounting', desc: 'Maintain cash book with debit/credit entries. View account balance, opening/closing balance. Track all financial transactions.' },
        hi: { title: 'लेखांकन', desc: 'डेबिट/क्रेडिट प्रविष्टियों के साथ नकद बही बनाए रखें। खाता शेष, शुरुआती/समापन शेष देखें। सभी वित्तीय लेनदेन ट्रैक करें।' },
        mr: { title: 'लेखा', desc: 'डेबिट/क्रेडिट नोंदींसह रोखवही ठेवा. खाते शिल्लक, उद्घाटन/समापन शिल्लक पाहा. सर्व आर्थिक व्यवहार ट्रॅक करा.' },
      },
      {
        icon: '💰', color: '#8b5cf6',
        en: { title: 'Petty Cash', desc: 'Track small daily cash in/out. View running cash balance. Filter by type (in/out/all).' },
        hi: { title: 'छोटी नकदी', desc: 'छोटे दैनिक नकद प्रवाह ट्रैक करें। चालू नकद शेष देखें। प्रकार के अनुसार फ़िल्टर करें।' },
        mr: { title: 'लहान रोकड', desc: 'लहान दैनिक रोकड आवक/जावक ट्रॅक करा. चालू रोकड शिल्लक पाहा. प्रकारानुसार फिल्टर करा.' },
      },
      {
        icon: '🏦', color: '#ef4444',
        en: { title: 'Loans', desc: 'Track vehicle or business loans. Record EMI payments, view remaining principal, total paid and outstanding balance.' },
        hi: { title: 'ऋण', desc: 'वाहन या व्यापार ऋण ट्रैक करें। ईएमआई भुगतान रिकॉर्ड करें, शेष मूलधन, कुल भुगतान और बकाया शेष देखें।' },
        mr: { title: 'कर्जे', desc: 'वाहन किंवा व्यवसाय कर्जे ट्रॅक करा. ईएमआय भरणे नोंदवा, उरलेले मुद्दल, एकूण भरलेले आणि थकबाकी शिल्लक पाहा.' },
      },
      {
        icon: '📝', color: '#06b6d4',
        en: { title: 'Freight Quotation', desc: 'Create freight quotations for customers. Set rate per KM, per Kg or flat rate. Auto-calculate distance using road routing. Share via WhatsApp.' },
        hi: { title: 'माल भाड़ा उद्धरण', desc: 'ग्राहकों के लिए माल भाड़ा उद्धरण बनाएं। प्रति किमी, प्रति किग्रा या फ्लैट दर सेट करें। सड़क मार्ग से दूरी स्वचालित गणना। व्हाट्सएप से शेयर करें।' },
        mr: { title: 'माल भाडे अवतरण', desc: 'ग्राहकांसाठी माल भाडे अवतरण तयार करा. किमी, किग्रा किंवा सपाट दर प्रति सेट करा. रस्ते मार्गाने अंतर आपोआप मोजा. व्हॉट्सॲपवर शेअर करा.' },
      },
    ]
  },
  {
    section: { en: 'Management', hi: 'प्रबंधन', mr: 'व्यवस्थापन' },
    items: [
      {
        icon: '📈', color: '#10b981',
        en: { title: 'Reports', desc: 'View trip-wise P&L, vehicle-wise performance, driver performance, expense breakdown. Receivables aging analysis (0-30, 31-60, 61-90, 90+ days). Print or share reports.' },
        hi: { title: 'रिपोर्ट', desc: 'ट्रिप-वार लाभ/हानि, वाहन-वार प्रदर्शन, ड्राइवर प्रदर्शन, व्यय विवरण देखें। प्राप्य आयु विश्लेषण (0-30, 31-60, 61-90, 90+ दिन)। रिपोर्ट प्रिंट या शेयर करें।' },
        mr: { title: 'अहवाल', desc: 'ट्रिपनिहाय नफा/तोटा, वाहननिहाय कामगिरी, चालक कामगिरी, खर्च तपशील पाहा. येणे बाकी वय विश्लेषण (0-30, 31-60, 61-90, 90+ दिवस). अहवाल प्रिंट किंवा शेअर करा.' },
      },
      {
        icon: '🔧', color: '#f59e0b',
        en: { title: 'Maintenance', desc: 'Schedule vehicle servicing (oil change, tyre rotation, brake service etc). Get due date reminders. Log service history with cost and garage details.' },
        hi: { title: 'रखरखाव', desc: 'वाहन सर्विसिंग शेड्यूल करें (तेल परिवर्तन, टायर रोटेशन, ब्रेक सर्विस आदि)। देय तिथि रिमाइंडर पाएं। लागत और गैरेज विवरण के साथ सेवा इतिहास लॉग करें।' },
        mr: { title: 'देखभाल', desc: 'वाहन सर्व्हिसिंग शेड्यूल करा (तेल बदल, टायर रोटेशन, ब्रेक सर्व्हिस इ.). देय तारीख स्मरणपत्रे मिळवा. खर्च आणि गॅरेज तपशीलांसह सेवा इतिहास नोंदवा.' },
      },
      {
        icon: '🔵', color: '#3b82f6',
        en: { title: 'Tyre Management', desc: 'Track every tyre by brand, size and position. Log KM at fitting and monitor total KM run. Know when tyres need replacement.' },
        hi: { title: 'टायर प्रबंधन', desc: 'ब्रांड, आकार और स्थिति के अनुसार प्रत्येक टायर ट्रैक करें। फिटिंग पर किमी लॉग करें और कुल किमी चले की निगरानी करें। जानें कब टायर बदलने की जरूरत है।' },
        mr: { title: 'टायर व्यवस्थापन', desc: 'ब्रँड, आकार आणि स्थानानुसार प्रत्येक टायर ट्रॅक करा. बसवताना किमी नोंदवा आणि एकूण किमी धावलेले निरीक्षण करा. टायर बदलणे आवश्यक असताना जाणून घ्या.' },
      },
      {
        icon: '📦', color: '#8b5cf6',
        en: { title: 'Inventory', desc: 'Manage spare parts and supplies stock. Get low-stock alerts when quantity falls below minimum. Log stock movements (in/out).' },
        hi: { title: 'इन्वेंटरी', desc: 'स्पेयर पार्ट्स और आपूर्ति स्टॉक प्रबंधित करें। मात्रा न्यूनतम से कम होने पर कम-स्टॉक अलर्ट पाएं। स्टॉक आवाजाही (अंदर/बाहर) लॉग करें।' },
        mr: { title: 'साठा', desc: 'सुटे भाग आणि पुरवठा साठा व्यवस्थापित करा. प्रमाण किमान पेक्षा कमी झाल्यावर कमी-साठा सूचना मिळवा. साठा हालचाली (आवक/जावक) नोंदवा.' },
      },
    ]
  },
  {
    section: { en: 'Masters', hi: 'मास्टर्स', mr: 'मास्टर्स' },
    items: [
      {
        icon: '🏢', color: '#06b6d4',
        en: { title: 'Customers', desc: 'Maintain customer database with GSTIN verification, address with pincode auto-fill. View customer ledger and outstanding balance per customer.' },
        hi: { title: 'ग्राहक', desc: 'जीएसटीआईएन सत्यापन, पिनकोड स्वत: भरने के साथ ग्राहक डेटाबेस बनाए रखें। ग्राहक बही और प्रत्येक ग्राहक का बकाया शेष देखें।' },
        mr: { title: 'ग्राहक', desc: 'जीएसटीआयएन पडताळणी, पिनकोड स्वयं-भरणासह ग्राहक डेटाबेस ठेवा. ग्राहक खातेवही आणि प्रत्येक ग्राहकाची थकबाकी शिल्लक पाहा.' },
      },
      {
        icon: '🤝', color: '#10b981',
        en: { title: 'Vendors', desc: 'Manage suppliers with GSTIN verify and IFSC auto-fill for bank details. Track vendor bills, due dates and mark payments. View overdue bills highlighted in red.' },
        hi: { title: 'विक्रेता', desc: 'जीएसटीआईएन सत्यापन और बैंक विवरण के लिए आईएफएससी स्वत: भरने के साथ आपूर्तिकर्ताओं का प्रबंधन करें। विक्रेता बिल, देय तिथियां ट्रैक करें। अतिदेय बिल लाल रंग में दिखते हैं।' },
        mr: { title: 'विक्रेते', desc: 'जीएसटीआयएन पडताळणी आणि बँक तपशीलांसाठी आयएफएससी स्वयं-भरणासह पुरवठादारांचे व्यवस्थापन करा. विक्रेता बिले, देय तारखा ट्रॅक करा. मुदत उलटलेली बिले लाल रंगात दिसतात.' },
      },
      {
        icon: '👥', color: '#f59e0b',
        en: { title: 'Agents', desc: 'Add freight agents with commission percentage. Track commissions earned per trip. View agent-wise performance.' },
        hi: { title: 'एजेंट', desc: 'कमीशन प्रतिशत के साथ माल एजेंट जोड़ें। प्रति ट्रिप अर्जित कमीशन ट्रैक करें। एजेंट-वार प्रदर्शन देखें।' },
        mr: { title: 'एजंट', desc: 'कमिशन टक्केवारीसह माल एजंट जोडा. ट्रिपनिहाय मिळालेले कमिशन ट्रॅक करा. एजंटनिहाय कामगिरी पाहा.' },
      },
      {
        icon: '🗺️', color: '#8b5cf6',
        en: { title: 'Routes', desc: 'Save common routes with from/to cities, distance and toll estimates. Quickly pick saved routes when creating trips.' },
        hi: { title: 'मार्ग', desc: 'शहरों से/तक, दूरी और टोल अनुमान के साथ सामान्य मार्ग सहेजें। ट्रिप बनाते समय सहेजे गए मार्ग जल्दी चुनें।' },
        mr: { title: 'मार्ग', desc: 'शहरांपासून/पर्यंत, अंतर आणि टोल अंदाजांसह सामान्य मार्ग जतन करा. ट्रिप तयार करताना जतन केलेले मार्ग लवकर निवडा.' },
      },
      {
        icon: '👨‍💼', color: '#ef4444',
        en: { title: 'Staff', desc: 'Add and manage app users (Owner / Manager / Staff roles). Each user has their own mobile login and password. Owner has full access.' },
        hi: { title: 'कर्मचारी', desc: 'ऐप उपयोगकर्ताओं को जोड़ें और प्रबंधित करें (मालिक / प्रबंधक / कर्मचारी भूमिकाएं)। प्रत्येक उपयोगकर्ता का अपना मोबाइल लॉगिन और पासवर्ड होता है।' },
        mr: { title: 'कर्मचारी', desc: 'ॲप वापरकर्ते जोडा आणि व्यवस्थापित करा (मालक / व्यवस्थापक / कर्मचारी भूमिका). प्रत्येक वापरकर्त्याचे स्वतःचे मोबाईल लॉगिन आणि पासवर्ड आहे.' },
      },
    ]
  },
  {
    section: { en: 'App & Data', hi: 'ऐप और डेटा', mr: 'ॲप आणि डेटा' },
    items: [
      {
        icon: '💾', color: '#3b82f6',
        en: { title: 'Backup & Restore', desc: 'Export all your data as a JSON file and save it anywhere (Google Drive, WhatsApp etc). Restore from backup anytime. All data is stored offline on your device.' },
        hi: { title: 'बैकअप और पुनर्स्थापना', desc: 'अपने सभी डेटा को JSON फ़ाइल के रूप में निर्यात करें और कहीं भी सहेजें। कभी भी बैकअप से पुनर्स्थापित करें। सभी डेटा आपके डिवाइस पर ऑफलाइन संग्रहीत है।' },
        mr: { title: 'बॅकअप आणि पुनर्संचयन', desc: 'सर्व डेटा JSON फाइल म्हणून निर्यात करा आणि कुठेही जतन करा. कधीही बॅकअपमधून पुनर्संचयित करा. सर्व डेटा तुमच्या डिव्हाइसवर ऑफलाइन साठवला आहे.' },
      },
      {
        icon: '🔍', color: '#10b981',
        en: { title: 'Search', desc: 'Global search across trips, LRs, vehicles, drivers, customers and vendors. Find any record instantly by name, number or any keyword.' },
        hi: { title: 'खोज', desc: 'ट्रिप, एलआर, वाहन, ड्राइवर, ग्राहक और विक्रेताओं में वैश्विक खोज। नाम, नंबर या किसी भी कीवर्ड से कोई भी रिकॉर्ड तुरंत ढूंढें।' },
        mr: { title: 'शोध', desc: 'ट्रिप, एलआर, वाहने, चालक, ग्राहक आणि विक्रेत्यांमध्ये जागतिक शोध. नाव, नंबर किंवा कोणत्याही कीवर्डद्वारे कोणताही रेकॉर्ड त्वरित शोधा.' },
      },
      {
        icon: '⚙️', color: '#8b5cf6',
        en: { title: 'Settings', desc: 'Set company name, GSTIN, address, LR/Invoice prefix. Change app language (English / हिंदी / मराठी). All settings saved offline.' },
        hi: { title: 'सेटिंग्स', desc: 'कंपनी का नाम, जीएसटीआईएन, पता, एलआर/चालान उपसर्ग सेट करें। ऐप भाषा बदलें (English / हिंदी / मराठी)। सभी सेटिंग्स ऑफलाइन सहेजी जाती हैं।' },
        mr: { title: 'सेटिंग्ज', desc: 'कंपनीचे नाव, जीएसटीआयएन, पत्ता, एलआर/बीजक उपसर्ग सेट करा. ॲप भाषा बदला (English / हिंदी / मराठी). सर्व सेटिंग्ज ऑफलाइन जतन केल्या जातात.' },
      },
    ]
  }
]

export default function Help() {
  const navigate = useNavigate()
  const { t, lang } = useT()
  const [expanded, setExpanded] = useState(null)

  const L = (obj) => obj[lang] ?? obj['en']

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 58 }}>
        <button onClick={() => navigate(-1)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text2)', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>{t('Help & Guide')}</div>
          <div style={{ fontSize: 10, color: 'var(--text2)' }}>{t('How to use')} · {lang === 'en' ? 'English' : lang === 'hi' ? 'हिंदी' : 'मराठी'}</div>
        </div>
      </div>

      <div className="page" style={{ paddingBottom: 'calc(var(--nav-h) + 24px)' }}>

        {/* Language note */}
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text2)' }}>
          💡 {lang === 'en' ? 'Change language from Settings → App Language' : lang === 'hi' ? 'सेटिंग्स → ऐप भाषा से भाषा बदलें' : 'सेटिंग्ज → ॲप भाषा मधून भाषा बदला'}
        </div>

        {FEATURES.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
              {L(group.section)}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              {group.items.map((item, ii) => {
                const isOpen = expanded === `${gi}-${ii}`
                const info = L(item)
                return (
                  <div key={ii}>
                    {ii > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '0 14px' }} />}
                    <button onClick={() => setExpanded(isOpen ? null : `${gi}-${ii}`)} style={{
                      width: '100%', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12,
                      background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left'
                    }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{info.title}</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2.5" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                    {isOpen && (
                      <div style={{ padding: '0 14px 14px 64px', fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
                        {info.desc}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text2)', marginTop: 8, lineHeight: 1.7 }}>
          Transport Manager v1.0<br/>
          {lang === 'hi' ? 'सभी डेटा आपके डिवाइस पर सुरक्षित है' : lang === 'mr' ? 'सर्व डेटा तुमच्या डिव्हाइसवर सुरक्षित आहे' : 'All data stored securely on your device'}
        </div>
      </div>
    </>
  )
}
