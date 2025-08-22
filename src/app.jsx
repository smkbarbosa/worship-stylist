import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import 'tailwindcss/tailwind.css';

// Componente principal do aplicativo
const App = () => {
  // Inicializa com 5 cores padrão, cada uma com um ID único e um array de imagens vazio.
  const initialColors = [
    { id: 'color-1', color: '#93c5fd', images: [] },
    { id: 'color-2', color: '#fde047', images: [] },
    { id: 'color-3', color: '#34d399', images: [] },
    { id: 'color-4', color: '#fca5a5', images: [] },
    { id: 'color-5', color: '#c084fc', images: [] }
  ];

  // Estados para gerenciar a paleta atual, o histórico e a visualização
  const [currentColors, setCurrentColors] = useState(initialColors);
  const [currentImages, setCurrentImages] = useState([]); // This state is no longer used for the main functionality
  const [currentNotes, setCurrentNotes] = useState('');
  const [history, setHistory] = useState([]);
  const [isHistoryView, setIsHistoryView] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Ref para o conteúdo que será convertido em PDF
  const pdfContentRef = useRef(null);

  // Efeito para carregar os dados do localStorage ao iniciar
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('worshipServiceStylesHistory');
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Falha ao carregar do localStorage:", e);
    }
  }, []);

  // Efeito para salvar os dados no localStorage sempre que o histórico muda
  useEffect(() => {
    try {
      localStorage.setItem('worshipServiceStylesHistory', JSON.stringify(history));
    } catch (e) {
      console.error("Falha ao salvar no localStorage:", e);
    }
  }, [history]);

  // Função para adicionar uma nova cor vazia à paleta
  const addNewColorField = () => {
    setCurrentColors([...currentColors, { id: Date.now(), color: '#ffffff', images: [] }]);
  };

  // Função para remover uma cor da paleta
  const handleRemoveColor = (idToRemove) => {
    setCurrentColors(currentColors.filter(colorObj => colorObj.id !== idToRemove));
  };

  // Função para adicionar uma imagem à paleta (converte para Base64 para salvar)
  const handleImageUpload = (e, colorId) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentColors(prevColors => {
          return prevColors.map(colorObj => {
            if (colorObj.id === colorId && colorObj.images.length < 3) {
              return { ...colorObj, images: [...colorObj.images, reader.result] };
            }
            return colorObj;
          });
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para remover uma imagem
  const handleImageRemove = (colorId, imageToRemove) => {
    setCurrentColors(prevColors => {
      return prevColors.map(colorObj => {
        if (colorObj.id === colorId) {
          const newImages = colorObj.images.filter(img => img !== imageToRemove);
          return { ...colorObj, images: newImages };
        }
        return colorObj;
      });
    });
  };

  // Função para salvar a paleta atual no histórico
  const savePalette = () => {
    // Filtra cores vazias antes de salvar
    const nonNullColors = currentColors.filter(c => c.color);
    if (nonNullColors.length > 0 || currentNotes.trim() !== '') {
      const newPalette = {
        id: Date.now(),
        colors: nonNullColors,
        notes: currentNotes,
        date: new Date().toLocaleString()
      };
      setHistory([newPalette, ...history]);
      resetCurrentPalette();
    }
  };

  // Função para carregar uma paleta do histórico
  const loadPalette = (palette) => {
    setCurrentColors(palette.colors);
    setCurrentImages([]); // Clear this state as it's no longer used
    setCurrentNotes(palette.notes);
    setIsHistoryView(false);
  };

  // Função para deletar uma paleta do histórico
  const deletePalette = (id) => {
    setHistory(history.filter(palette => palette.id !== id));
  };

  // Função para resetar a paleta atual
  const resetCurrentPalette = () => {
    setCurrentColors(initialColors);
    setCurrentImages([]);
    setCurrentNotes('');
  };

  // Função para gerar o PDF
  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    await new Promise(resolve => setTimeout(resolve, 100));

    const content = pdfContentRef.current;
    if (content) {
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });
      const imgWidth = 595;
      const pageHeight = 842;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save('Worship_Service_Styles.pdf');
    }
    setIsGeneratingPdf(false);
  };

  // Renderização condicional
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 p-4 font-sans text-gray-800">
      {/* Cabeçalho do aplicativo */}
      <header className="flex flex-col items-center justify-center p-6 bg-white shadow-lg rounded-xl mb-6">
        <h1 className="text-4xl font-bold text-indigo-700">Worship Service Styles</h1>
        <p className="mt-2 text-md text-gray-600">
          Gerador de paletas de cores e referências para cultos e eventos.
        </p>
      </header>

      {/* Botões de navegação */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setIsHistoryView(false)}
          className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
            !isHistoryView ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Nova Paleta
        </button>
        <button
          onClick={() => setIsHistoryView(true)}
          className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
            isHistoryView ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Ver Histórico
        </button>
      </div>

      {/* Conteúdo principal: Paleta ou Histórico */}
      <main className="flex-1 flex flex-col items-center">
        {!isHistoryView ? (
          /* Visualização da paleta atual */
          <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Criar Nova Paleta</h2>

            {/* Seção de Cores */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Paleta de Cores ({currentColors.length})</h3>
              <div className="flex flex-col gap-8">
                {currentColors.map((colorObj, index) => (
                  <div key={colorObj.id} className="flex flex-col items-center">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="relative group">
                        <input
                          type="color"
                          value={colorObj.color}
                          onChange={(e) => {
                            const newColors = [...currentColors];
                            newColors[index] = { ...colorObj, color: e.target.value };
                            setCurrentColors(newColors);
                          }}
                          className="w-16 h-16 rounded-full cursor-pointer border-2 border-gray-300"
                        />
                        <button
                          onClick={() => handleRemoveColor(colorObj.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center leading-none text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover cor"
                        >
                          &times;
                        </button>
                      </div>
                      <span className="text-md font-medium text-gray-700">{colorObj.color.toUpperCase()}</span>
                    </div>
                    {/* Seção de Fotos vinculada à cor */}
                    <div className="flex flex-wrap gap-4 items-center pl-20">
                      <label className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-gray-400 rounded-lg cursor-pointer text-gray-500 hover:bg-gray-50 transition-colors">
                        <span className="text-4xl">+</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, colorObj.id)}
                          disabled={colorObj.images.length >= 3}
                          title={colorObj.images.length >= 3 ? 'Máximo de 3 fotos por cor' : 'Adicionar foto'}
                        />
                      </label>
                      {colorObj.images.map((image, imageIndex) => (
                        <div key={imageIndex} className="relative w-24 h-24 rounded-lg overflow-hidden shadow-md">
                          <img src={image} alt={`Referência ${imageIndex}`} className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleImageRemove(colorObj.id, image)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 leading-none text-xs"
                            title="Remover foto"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  onClick={addNewColorField}
                  className="mt-4 px-6 py-3 bg-indigo-500 text-white rounded-full font-bold shadow-md hover:bg-indigo-600 transition-colors w-full max-w-xs self-center"
                  title="Adicionar mais uma cor"
                >
                  Adicionar Cor
                </button>
              </div>
            </section>

            {/* Seção de Observações */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Observações</h3>
              <textarea
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                rows="4"
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                placeholder="Adicione notas sobre o estilo, vibe ou sugestões..."
              ></textarea>
            </section>

            {/* Botões de Ação */}
            <div className="flex justify-center gap-4">
              <button
                onClick={savePalette}
                className="px-6 py-3 bg-green-500 text-white rounded-full font-bold shadow-md hover:bg-green-600 transition-colors"
              >
                Salvar Paleta
              </button>
              <button
                onClick={generatePDF}
                className={`px-6 py-3 rounded-full font-bold shadow-md transition-colors ${
                  isGeneratingPdf ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? 'Gerando PDF...' : 'Gerar PDF'}
              </button>
            </div>
          </div>
        ) : (
          /* Visualização do histórico */
          <div className="w-full max-w-4xl bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Histórico de Paletas Salvas ({history.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {history.length > 0 ? (
                history.map((palette) => (
                  <div
                    key={palette.id}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">{palette.date}</p>
                      <div className="flex gap-1 mb-2">
                        {palette.colors.map((colorObj, index) => (
                          <div key={index} className="w-6 h-6 rounded-full" style={{ backgroundColor: colorObj.color }}></div>
                        ))}
                      </div>
                      <p className="text-gray-600 text-sm italic line-clamp-3">{palette.notes || 'Sem observações'}</p>
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => loadPalette(palette)}
                        className="flex-1 px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-full hover:bg-indigo-600 transition-colors"
                      >
                        Carregar
                      </button>
                      <button
                        onClick={() => deletePalette(palette.id)}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-300 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic col-span-full text-center">Nenhuma paleta salva ainda. Crie uma!</p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Seção oculta para gerar o PDF */}
      <div ref={pdfContentRef} className="absolute left-[-9999px] top-[-9999px] w-[794px] h-[1123px] p-10 bg-white" style={{ display: isGeneratingPdf ? 'block' : 'none' }}>
        <h1 className="text-4xl font-bold text-indigo-700 text-center mb-8">Worship Service Styles</h1>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Paleta Selecionada</h2>
          <div className="flex flex-wrap gap-4 items-center mb-4">
            {currentColors.map((colorObj, index) => (
              <div key={index} className="w-24 h-24 rounded-full border-2 border-gray-300 relative" style={{ backgroundColor: colorObj.color }}>
                <span className="absolute bottom-[-20px] left-1/2 transform -translate-x-1/2 text-sm text-gray-600">{colorObj.color.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Imagens de Referência</h2>
          <div className="flex flex-wrap gap-4">
            {currentColors.flatMap((colorObj) => colorObj.images.map((image, index) => (
              <div key={index} className="w-40 h-40 border border-gray-300 rounded-lg overflow-hidden">
                <img src={image} alt={`Referência ${index}`} className="w-full h-full object-cover" />
              </div>
            )))}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Observações</h2>
          <p className="text-gray-700">{currentNotes || 'Nenhuma observação.'}</p>
        </div>
      </div>
    </div>
  );
};

export default App;
