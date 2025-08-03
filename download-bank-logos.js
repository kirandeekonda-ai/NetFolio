const fs = require('fs');
const path = require('path');
const https = require('https');

// List of all Indian banks with their codes
const banks = [
  { code: 'hdfc', name: 'HDFC Bank' },
  { code: 'icic', name: 'ICICI Bank' },
  { code: 'utib', name: 'Axis Bank' },
  { code: 'kkbk', name: 'Kotak Mahindra Bank' },
  { code: 'yesb', name: 'Yes Bank' },
  { code: 'indb', name: 'IndusInd Bank' },
  { code: 'sbin', name: 'State Bank of India' },
  { code: 'punb', name: 'Punjab National Bank' },
  { code: 'barb', name: 'Bank of Baroda' },
  { code: 'cnrb', name: 'Canara Bank' },
  { code: 'ubin', name: 'Union Bank of India' },
  { code: 'bkid', name: 'Bank of India' },
  { code: 'cbin', name: 'Central Bank of India' },
  { code: 'idib', name: 'Indian Bank' },
  { code: 'ioba', name: 'Indian Overseas Bank' },
  { code: 'psib', name: 'Punjab & Sind Bank' },
  { code: 'ucba', name: 'UCO Bank' },
  { code: 'mahb', name: 'Bank of Maharashtra' },
  { code: 'bdbl', name: 'Bandhan Bank' },
  { code: 'aubl', name: 'AU Small Finance Bank' },
  { code: 'ratn', name: 'RBL Bank' },
  { code: 'idfb', name: 'IDFC First Bank' },
  { code: 'ibkl', name: 'IDBI Bank' },
  { code: 'sibl', name: 'South Indian Bank' },
  { code: 'karb', name: 'Karnataka Bank' },
  { code: 'fdrl', name: 'Federal Bank' },
  { code: 'ciub', name: 'City Union Bank' },
  { code: 'jaka', name: 'Jammu & Kashmir Bank' },
  { code: 'kvbl', name: 'Karur Vysya Bank' },
  { code: 'dlxb', name: 'Dhanalakshmi Bank' },
  { code: 'tmbl', name: 'Tamilnad Mercantile Bank' },
  { code: 'ntbl', name: 'The Nainital Bank' },
  { code: 'csbk', name: 'CSB Bank' },
  { code: 'dcbl', name: 'DCB Bank' }
];

const downloadFile = (url, destPath) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded: ${path.basename(destPath)}`);
          resolve();
        });
      } else {
        console.log(`❌ Failed to download ${url}: Status ${response.statusCode}`);
        file.close();
        fs.unlinkSync(destPath); // Delete the empty file
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(destPath); // Delete the empty file
      console.log(`❌ Error downloading ${url}:`, err.message);
      reject(err);
    });
  });
};

async function downloadBankLogos() {
  const logoDir = path.join(__dirname, 'public', 'bank-logos');
  
  // Ensure directory exists
  if (!fs.existsSync(logoDir)) {
    fs.mkdirSync(logoDir, { recursive: true });
  }

  console.log(`🚀 Starting download of ${banks.length} bank logos...`);
  console.log(`📁 Saving to: ${logoDir}`);

  let successCount = 0;
  let failCount = 0;

  for (const bank of banks) {
    try {
      const url = `https://raw.githubusercontent.com/praveenpuglia/indian-banks/main/assets/logos/${bank.code}/symbol.png`;
      const destPath = path.join(logoDir, `${bank.code}.png`);
      
      // Skip if file already exists
      if (fs.existsSync(destPath)) {
        console.log(`⏭️  Skipped: ${bank.code}.png (already exists)`);
        continue;
      }

      await downloadFile(url, destPath);
      successCount++;
      
      // Small delay to be respectful to the server
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      failCount++;
      console.log(`❌ Failed to download ${bank.code}: ${error.message}`);
    }
  }

  console.log(`\n🎉 Download Summary:`);
  console.log(`✅ Successfully downloaded: ${successCount} logos`);
  console.log(`❌ Failed downloads: ${failCount} logos`);
  console.log(`📁 Logos saved to: ${logoDir}`);
  
  // Generate a mapping file for easy reference
  const mapping = banks.map(bank => ({
    code: bank.code,
    name: bank.name,
    logoPath: `/bank-logos/${bank.code}.png`
  }));
  
  const mappingPath = path.join(logoDir, 'bank-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`📋 Bank mapping saved to: ${mappingPath}`);
}

// Run the download
downloadBankLogos().catch(console.error);
