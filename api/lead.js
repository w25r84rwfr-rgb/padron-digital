const AIRTABLE_BASE_ID = 'appVdrViw3I8A6ovQ';
const AIRTABLE_TABLE = 'Website Requests';

function clean(value, max = 5000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return res.status(500).json({ error: 'Lead service is not configured.' });

  const body = req.body || {};
  if (clean(body.companyWebsite, 200)) return res.status(200).json({ ok: true });

  const name = clean(body.name, 120);
  const business = clean(body.business, 160);
  const email = clean(body.email, 254);
  const phone = clean(body.phone, 50);
  const businessType = clean(body.businessType, 120);
  const website = clean(body.website, 500);
  const plan = clean(body.plan, 120);
  const services = clean(body.services, 3000);
  const details = clean(body.details, 5000);

  if (!name || !business || !email || !phone || !details) {
    return res.status(400).json({ error: 'Please complete all required fields.' });
  }

  const allowedPlans = new Set([
    'Website Build — $499 one-time',
    'Website + Care — $49.99/month'
  ]);
  if (!allowedPlans.has(plan)) return res.status(400).json({ error: 'Please choose a valid package.' });

  const fields = {
    'Customer Name': name,
    'Business Name': business,
    'Email': email,
    'Phone Number': phone,
    'Business Type': businessType,
    'Requested Services': services,
    'Selected Package': plan,
    'Project Details': details,
    'Date Submitted': new Date().toISOString().slice(0, 10),
    'Status': 'New Lead',
    'Lead Source': 'Website'
  };
  if (website) fields['Current Website'] = website;

  try {
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records: [{ fields }], typecast: true })
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Airtable error:', response.status, detail);
      return res.status(502).json({ error: 'Unable to save request.' });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Lead submission error:', error);
    return res.status(500).json({ error: 'Unable to send request.' });
  }
}
