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
  const [currentImages, setCurrentImages] = useState([]); // Este estado não é mais usado para a funcionalidade principal
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
    setCurrentImages([]); // Limpa este estado, pois ele não é mais usado
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
    // Pequeno atraso para garantir que o conteúdo oculto foi renderizado
    await new Promise(resolve => setTimeout(resolve, 100));

    const content = pdfContentRef.current;
    if (content) {
      const canvas = await html2canvas(content, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: content.scrollWidth,
        height: content.scrollHeight
      });

      // Converte o canvas para uma imagem JPEG com qualidade otimizada
      const imgData = canvas.toDataURL('image/JPEG', 0.95);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Dimensões A4 em mm com margens de 2cm
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 20; // 2cm margins in mm
      const contentWidth = pageWidth - (2 * margin); // 170mm
      const contentHeight = pageHeight - (2 * margin); // 257mm
      
      // Calcula as dimensões da imagem respeitando as margens
      const imgAspectRatio = canvas.width / canvas.height;
      let imgWidth = contentWidth;
      let imgHeight = contentWidth / imgAspectRatio;
      
      // Se a altura da imagem exceder o conteúdo disponível, ajusta proporcionalmente
      if (imgHeight > contentHeight) {
        imgHeight = contentHeight;
        imgWidth = contentHeight * imgAspectRatio;
      }
      
      let remainingHeight = imgHeight;
      let currentY = 0;
      let pageNum = 0;
      
      while (remainingHeight > 0) {
        if (pageNum > 0) {
          pdf.addPage();
        }
        
        // Calcula a altura da seção a ser adicionada nesta página
        const sectionHeight = Math.min(remainingHeight, contentHeight);
        
        // Calcula a posição Y da imagem no canvas para esta seção
        const sourceY = currentY * (canvas.height / imgHeight);
        const sourceHeight = sectionHeight * (canvas.height / imgHeight);
        
        // Cria um canvas temporário para esta seção
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        
        // Desenha a seção no canvas temporário
        tempCtx.drawImage(
          canvas,
          0, sourceY, canvas.width, sourceHeight,
          0, 0, canvas.width, sourceHeight
        );
        
        const sectionImgData = tempCanvas.toDataURL('image/JPEG', 0.95);
        
        // Adiciona a seção no PDF
        pdf.addImage(
          sectionImgData,
          'JPEG',
          margin,
          margin,
          imgWidth,
          sectionHeight
        );
        
        remainingHeight -= sectionHeight;
        currentY += sectionHeight;
        pageNum++;
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
      <div ref={pdfContentRef} className="absolute left-[-9999px] top-[-9999px] bg-white" style={{ 
        display: isGeneratingPdf ? 'block' : 'none',
        width: '170mm', // A4 width minus 2cm margins on each side
        padding: '10mm',
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        lineHeight: '1.4',
        color: '#000000'
      }}>
        <h1 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#4338ca', 
          textAlign: 'center', 
          marginBottom: '20px',
          pageBreakAfter: 'avoid'
        }}>Worship Service Styles</h1>
        
        <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: '#1f2937', 
            marginBottom: '12px',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '4px'
          }}>Paleta Selecionada</h2>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '12px', 
            alignItems: 'center', 
            marginBottom: '12px' 
          }}>
            {currentColors.map((colorObj, index) => (
              <div key={index} style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  border: '2px solid #d1d5db',
                  backgroundColor: colorObj.color,
                  marginBottom: '4px'
                }}></div>
                <span style={{ 
                  fontSize: '10px', 
                  color: '#4b5563',
                  textAlign: 'center'
                }}>{colorObj.color.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
        
        {currentColors.flatMap(colorObj => colorObj.images).length > 0 && (
          <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
            <h2 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              color: '#1f2937', 
              marginBottom: '12px',
              borderBottom: '2px solid #e5e7eb',
              paddingBottom: '4px'
            }}>Imagens de Referência</h2>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
              marginBottom: '12px'
            }}>
              {currentColors.flatMap((colorObj) => colorObj.images.map((image, index) => (
                <div key={index} style={{ 
                  border: '1px solid #d1d5db', 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  pageBreakInside: 'avoid'
                }}>
                  <img 
                    src={image} 
                    alt={`Referência ${index}`} 
                    style={{ 
                      width: '100%', 
                      height: '120px', 
                      objectFit: 'cover',
                      display: 'block'
                    }} 
                  />
                </div>
              )))}
            </div>
          </div>
        )}
        
        <div style={{ pageBreakInside: 'avoid' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: '#1f2937', 
            marginBottom: '12px',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '4px'
          }}>Observações</h2>
          <div style={{ 
            fontSize: '12px',
            color: '#374151',
            lineHeight: '1.5',
            backgroundColor: '#f9fafb',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb'
          }}>
            {currentNotes || 'Nenhuma observação.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
