import React, { useState } from 'react';
import { detectDisease } from '../api/diseaseApi';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', 0.8);
      };
    };
  });
};

export default function DiseaseDetection() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [cropType, setCropType] = useState('Unknown/Other');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);

    try {
      const compressed = await compressImage(image);
      const res = await detectDisease(compressed, cropType);
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to detect disease. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Plant Disease Detection 🌿</h1>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
              <p className="text-gray-600 mb-4">
                Upload a photo of a sick plant leaf. Our Vision AI will automatically detect the disease and recommend the best treatments.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Crop Type</label>
                <select
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  className="w-full max-w-xs border border-gray-300 rounded-lg p-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="Unknown/Other">Unknown / Other</option>
                  <option value="Tomato">Tomato</option>
                  <option value="Apple">Apple</option>
                  <option value="Potato">Potato</option>
                  <option value="Corn (Maize)">Corn (Maize)</option>
                  <option value="Wheat">Wheat</option>
                  <option value="Grape">Grape</option>
                  <option value="Strawberry">Strawberry</option>
                </select>
              </div>
              
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-green-300 rounded-xl p-8 bg-green-50">
                {preview ? (
                  <img src={preview} alt="Plant Preview" className="h-64 object-cover rounded-lg mb-4 shadow-sm" />
                ) : (
                  <div className="text-6xl mb-4">📸</div>
                )}
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full max-w-xs text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-green-100 file:text-green-700
                    hover:file:bg-green-200 cursor-pointer"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={!image || loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium shadow-sm transition-all"
                >
                  {loading ? 'Analyzing...' : 'Analyze Image'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200">
                {error}
              </div>
            )}

            {result && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in-up">
                <div className="bg-green-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center justify-between">
                    <span>Diagnosis Result</span>
                    <span className="text-sm bg-green-500 px-2 py-1 rounded-full">
                      {result.confidence}% Confidence
                    </span>
                  </h2>
                </div>
                
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Detected Condition</h3>
                    <p className="text-2xl font-bold text-gray-800">{result.disease_name}</p>
                    <p className="text-gray-600 mt-2">{result.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <h3 className="font-bold text-green-800 mb-2 flex items-center">
                        <span className="text-xl mr-2">🌱</span> Organic Treatment
                      </h3>
                      <p className="text-green-900 text-sm leading-relaxed">
                        {result.organic_treatment}
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <h3 className="font-bold text-blue-800 mb-2 flex items-center">
                        <span className="text-xl mr-2">🧪</span> Chemical Treatment
                      </h3>
                      <p className="text-blue-900 text-sm leading-relaxed">
                        {result.chemical_treatment}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </main>
      </div>
    </div>
  );
}
