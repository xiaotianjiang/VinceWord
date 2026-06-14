// @ts-nocheck
'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useEffect } from 'react';
import PermissionGuard from '@/components/PermissionGuard';
import { CozeAPI } from '@coze/api';

// 打印样式 - 确保图片保持彩色
const printStyles = `
  @media print {
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    img {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      filter: none !important;
    }
    
    .pdf-preview img {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    /* 确保背景颜色也能打印 */
    .bg-white, .bg-gray-50, .bg-gray-100 {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

interface FoodItem {
  id: string;
  name: string;
  price?: string;
  description?: string;
  category?: string;
  imageUrl?: string;
}

interface MenuSection {
  id: string;
  title: string;
  foodItems: FoodItem[];
  imageUrl?: string;
  layout: 'left-text-right-image' | 'left-image-right-text' | 'full-image' | 'full-text';
}

interface Template {
  id: string;
  name: string;
  description: string;
  sectionsPerPage: number;
  itemsPerSection: number;
  showPrice: boolean;
  showDescription: boolean;
  headerStyle: 'elegant' | 'modern' | 'traditional';
  styleDesc: string;
  bgColor: string;
  textColor: string;
}

// 图片编辑器组件
interface ImageEditorProps {
  sectionId: string;
  foodItem?: FoodItem;
  imageUrl?: string;
  onUpload: (sectionId: string, foodItemId: string, file: File) => void;
  onAIGenerate: (sectionId: string, foodItem: FoodItem) => void;
  generating: boolean;
  className?: string;
  overlayText?: string;
  overlayContent?: React.ReactNode;
}

const ImageEditor: React.FC<ImageEditorProps> = ({
  sectionId,
  foodItem,
  imageUrl,
  onUpload,
  onAIGenerate,
  generating,
  className = 'h-72',
  overlayText,
  overlayContent
}) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files?.[0] && foodItem) {
        onUpload(sectionId, foodItem.id, files[0]);
      }
    };
    input.click();
    setShowMenu(false);
  };
  
  const handleAIGenerate = () => {
    if (foodItem) {
      onAIGenerate(sectionId, foodItem);
    }
    setShowMenu(false);
  };
  
  return (
    <div 
      className={`relative overflow-hidden rounded-lg cursor-pointer group ${className}`}
      style={{ minWidth: '100%' }}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => setShowMenu(false)}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={foodItem?.name || ''} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400 text-sm">点击添加图片</span>
        </div>
      )}
      
      {overlayContent}
      
      {overlayText && imageUrl && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
          <h3 className="text-white text-xl font-bold">{overlayText}</h3>
        </div>
      )}
      
      {showMenu && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 z-10 no-print">
          <button
            onClick={handleUpload}
            className="px-3 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 text-sm"
          >
            📷 上传图片
          </button>
          <button
            onClick={handleAIGenerate}
            disabled={generating}
            className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 text-sm"
          >
            🤖 AI生成
          </button>
        </div>
      )}
    </div>
  );
};

interface MainImageSelectorProps {
  section: MenuSection;
  onSelect: (foodItem: FoodItem | undefined) => void;
  onAIGenerate: (foodItem: FoodItem | undefined) => void;
  generating: boolean;
  className?: string;
  showOverlay?: boolean;
}

const MainImageSelector: React.FC<MainImageSelectorProps> = ({
  section,
  onSelect,
  onAIGenerate,
  generating,
  className = 'h-72',
  showOverlay = false
}) => {
  const [showSelector, setShowSelector] = useState(false);
  const selectedFood = section.foodItems.find(f => f.imageUrl);
  const imageUrl = selectedFood?.imageUrl;
  
  return (
    <div className="relative">
      <div 
        className={`relative overflow-hidden rounded-lg cursor-pointer ${className}`}
        style={{ minWidth: '100%' }}
        onMouseEnter={() => setShowSelector(true)}
        onMouseLeave={() => setShowSelector(false)}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={selectedFood?.name || ''} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
            <span className="text-gray-400 text-sm">选择菜品生成主图</span>
            <span className="text-gray-400 text-xs mt-1">悬停选择菜品</span>
          </div>
        )}
        
        {showOverlay && imageUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
            <div>
              <h4 className="text-white font-bold text-lg">{selectedFood?.name}</h4>
              {selectedFood?.price && <p className="text-orange-400">¥{selectedFood.price}</p>}
            </div>
          </div>
        )}
        
        {showSelector && (
          <div className="absolute inset-0 bg-black/50 z-10 no-print">
            <div className="absolute top-2 right-2 bg-white rounded-lg shadow-lg p-2">
              <p className="text-xs text-gray-600 mb-2">选择菜品:</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {section.foodItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setShowSelector(false);
                      onSelect(item);
                    }}
                    className={`w-full px-2 py-1 text-xs rounded text-left hover:bg-gray-100 flex justify-between items-center ${
                      selectedFood?.id === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    <span className="truncate max-w-32">{item.name}</span>
                    {item.imageUrl && <span className="text-green-500">✓</span>}
                  </button>
                ))}
              </div>
              <div className="border-t mt-2 pt-2">
                <button
                  onClick={() => {
                    setShowSelector(false);
                    onAIGenerate(selectedFood);
                  }}
                  disabled={generating || !selectedFood}
                  className="w-full px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
                >
                  🤖 AI生成
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const templates: Template[] = [
  { 
    id: 't1', 
    name: '经典双栏', 
    description: '左侧菜名列表，右侧精美图片，经典搭配',
    sectionsPerPage: 2,
    itemsPerSection: 5,
    showPrice: true,
    showDescription: false,
    headerStyle: 'traditional',
    styleDesc: '传统中式风格，典雅大方，适合中餐厅',
    bgColor: 'bg-amber-50',
    textColor: 'text-gray-800'
  },
  { 
    id: 't2', 
    name: '图文并茂', 
    description: '上方大图展示，下方菜品列表，可添加描述',
    sectionsPerPage: 2,
    itemsPerSection: 4,
    showPrice: true,
    showDescription: true,
    headerStyle: 'elegant',
    styleDesc: '优雅精致风格，高端大气，适合西餐厅',
    bgColor: 'bg-white',
    textColor: 'text-gray-800'
  },
  { 
    id: 't3', 
    name: '全菜名列表', 
    description: '纯文字菜单，简洁大方，适合素食/酒水',
    sectionsPerPage: 4,
    itemsPerSection: 8,
    showPrice: true,
    showDescription: false,
    headerStyle: 'modern',
    styleDesc: '现代极简风格，简洁干净，适合咖啡厅',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700'
  },
  { 
    id: 't4', 
    name: '杂志风格', 
    description: '大图标题+多栏菜品，时尚感强',
    sectionsPerPage: 1,
    itemsPerSection: 6,
    showPrice: true,
    showDescription: true,
    headerStyle: 'modern',
    styleDesc: '时尚杂志风格，潮流前卫，适合创意餐厅',
    bgColor: 'bg-purple-50',
    textColor: 'text-gray-800'
  },
  { 
    id: 't5', 
    name: '卡片网格', 
    description: '每菜一个小卡片，适合快餐/咖啡厅',
    sectionsPerPage: 1,
    itemsPerSection: 9,
    showPrice: true,
    showDescription: false,
    headerStyle: 'modern',
    styleDesc: '清新卡片风格，活泼可爱，适合快餐店',
    bgColor: 'bg-orange-50',
    textColor: 'text-gray-800'
  },
  { 
    id: 't6', 
    name: '全景大图', 
    description: '每菜一张大图，高端餐厅适用',
    sectionsPerPage: 2,
    itemsPerSection: 2,
    showPrice: true,
    showDescription: true,
    headerStyle: 'elegant',
    styleDesc: '高端大气风格，精美奢华，适合星级餐厅',
    bgColor: 'bg-gradient-to-br from-white to-gray-100',
    textColor: 'text-gray-900'
  },
  { 
    id: 't7', 
    name: '复古经典', 
    description: '传统中式菜单风格',
    sectionsPerPage: 2,
    itemsPerSection: 6,
    showPrice: true,
    showDescription: false,
    headerStyle: 'traditional',
    styleDesc: '复古怀旧风格，古典韵味，适合老字号餐厅',
    bgColor: 'bg-gradient-to-br from-amber-100 to-amber-50',
    textColor: 'text-gray-800'
  },
  { 
    id: 't8', 
    name: '现代简约', 
    description: '极简风格，留白多',
    sectionsPerPage: 3,
    itemsPerSection: 6,
    showPrice: true,
    showDescription: false,
    headerStyle: 'elegant',
    styleDesc: '极简主义风格，留白艺术，适合高端会所',
    bgColor: 'bg-slate-50',
    textColor: 'text-gray-600'
  },
  { 
    id: 't9', 
    name: '特色推荐', 
    description: '单品大图展示，主打菜品推广',
    sectionsPerPage: 1,
    itemsPerSection: 1,
    showPrice: true,
    showDescription: true,
    headerStyle: 'elegant',
    styleDesc: '精品推荐风格，突出重点，适合招牌菜展示',
    bgColor: 'bg-gradient-to-br from-rose-50 to-white',
    textColor: 'text-gray-800'
  },
  { 
    id: 't10', 
    name: '分类布局', 
    description: '左侧标题右侧菜品，综合餐厅',
    sectionsPerPage: 2,
    itemsPerSection: 4,
    showPrice: true,
    showDescription: false,
    headerStyle: 'traditional',
    styleDesc: '分类清晰风格，条理分明，适合综合餐厅',
    bgColor: 'bg-lime-50',
    textColor: 'text-gray-800'
  },
  { 
    id: 't11', 
    name: '对角分栏', 
    description: '左图右文交替，创意餐厅',
    sectionsPerPage: 2,
    itemsPerSection: 4,
    showPrice: true,
    showDescription: false,
    headerStyle: 'modern',
    styleDesc: '创意对角风格，新颖独特，适合主题餐厅',
    bgColor: 'bg-teal-50',
    textColor: 'text-gray-800'
  },
  { 
    id: 't12', 
    name: '双拼展示', 
    description: '列表+图片组合，特色推荐',
    sectionsPerPage: 2,
    itemsPerSection: 5,
    showPrice: true,
    showDescription: false,
    headerStyle: 'traditional',
    styleDesc: '双拼组合风格，图文并茂，适合特色餐厅',
    bgColor: 'bg-indigo-50',
    textColor: 'text-gray-800'
  }
];

export default function FoodMenuCreate() {
  const [step, setStep] = useState(1);
  const [foodNamesInput, setFoodNamesInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(templates[0]);
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [parsingWithAI, setParsingWithAI] = useState(false);
  const [thinkingContent, setThinkingContent] = useState<string[]>([]);
  const [currentThinking, setCurrentThinking] = useState('');
  const [cozeClient, setCozeClient] = useState<CozeAPI | null>(null);
  const [imageStyle, setImageStyle] = useState<'realistic' | 'photorealistic' | 'cartoon'>('realistic');
  const [menuTitle, setMenuTitle] = useState('精美食谱');
  const [menuSubtitle, setMenuSubtitle] = useState('精选美味 · 匠心烹饪');
  const [selectedImageFoodId, setSelectedImageFoodId] = useState<string | null>(null);
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [imageSelectorTarget, setImageSelectorTarget] = useState<{sectionId: string; type: 'main' | 'single'} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thinkingContainerRef = useRef<HTMLDivElement>(null);

  // 初始化扣子API客户端
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_COZE_API_KEY;
    if (apiKey) {
      const client = new CozeAPI({
        token: apiKey,
        baseURL: 'https://api.coze.cn',
        allowPersonalAccessTokenInBrowser: true
      });
      setCozeClient(client);
    }
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (thinkingContainerRef.current) {
      thinkingContainerRef.current.scrollTop = thinkingContainerRef.current.scrollHeight;
    }
  }, [thinkingContent, currentThinking]);

  // 步骤1: 解析菜品名称
  const parseFoodNames = async () => {
    const names = foodNamesInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (names.length === 0) {
      alert('请输入至少一个菜品名称');
      return;
    }
    
    // 如果有cozeClient，优先使用AI解析
    if (cozeClient) {
      setParsingWithAI(true);
      setLoading(true);
      setThinkingContent([]);
      setCurrentThinking('');
      
      try {
        const foodListStr = names.join('、');
        const prompt = `请为以下菜品列表生成详细信息，不要思考快速给出答案，返回JSON数组格式。每道菜包含name(菜品名称)、price(建议价格，整数)、desc(简短描述，10个字以内)、category(菜品分类，如：鱼类、牛肉类、虾类、猪肉类、家常菜、时蔬类、汤类)。只返回JSON数组，不要其他内容。\n\n菜品列表：${foodListStr}`;
        
        setThinkingContent(prev => [...prev, '🤖 AI正在解析菜品信息...']);
        
        const botId = process.env.NEXT_PUBLIC_COZE_BOT_ID;
        if (!botId) {
          throw new Error('未配置COZE_BOT_ID');
        }
        
        const stream = await cozeClient.chat.stream({
          bot_id: botId,
          user_id: 'menu-parser-user',
          additional_messages: [
            {
              content: prompt,
              content_type: 'text',
              role: 'user',
              type: 'question'
            }
          ]
        });
        
        let fullResponse = '';
        let thinkingText = '';
        
        for await (const chunk of stream) {
          if (chunk.event !== 'conversation.message.completed') {
            if (chunk.data) {
              try {
                const data = typeof chunk.data === 'string' ? JSON.parse(chunk.data) : chunk.data;
                if (data.reasoning_content) {
                  thinkingText += data.reasoning_content;
                  setCurrentThinking(thinkingText);
                }
              } catch (e) {
                // ignore parse error
              }
            }
            continue;
          }
          
          if (chunk.data) {
            try {
              const data = typeof chunk.data === 'string' ? JSON.parse(chunk.data) : chunk.data;
              if (data.content) {
                fullResponse += data.content;
              }
            } catch (e) {
              // ignore parse error
            }
          }
          
          if (chunk.message?.content) {
            fullResponse += chunk.message.content;
          }
        }
        
        setThinkingContent(prev => [...prev.filter(c => c !== '🤖 AI正在解析菜品信息...'), `✅ AI解析完成`]);
        setCurrentThinking('');
        
        // 尝试解析AI返回的JSON
        const parsedFoods = parseAIResponse(fullResponse);
        
        if (parsedFoods.length > 0) {
          const foodItems: FoodItem[] = parsedFoods.map((food: any, index: number) => ({
            id: `food-${index}-${Date.now()}`,
            name: food.name || names[index] || '',
            price: food.price ? String(food.price) : undefined,
            description: food.desc || '',
            category: food.category || '家常菜'
          })).filter((item: FoodItem) => item.name);
          
          generateSections(foodItems);
          setStep(2);
        } else {
          // AI解析失败，使用原始输入
          const foodItems: FoodItem[] = names.map((name, index) => {
            const parts = name.split(',');
            return {
              id: `food-${index}-${Date.now()}`,
              name: parts[0]?.trim() || '',
              price: parts[1]?.trim(),
              description: parts[2]?.trim(),
              category: parts[3]?.trim() || '家常菜'
            };
          }).filter(item => item.name);
          
          generateSections(foodItems);
          setStep(2);
        }
      } catch (error) {
        console.error('AI解析失败:', error);
        setThinkingContent(prev => [...prev, `❌ AI解析失败: ${error}`]);
        
        // AI失败时使用原始输入
        const foodItems: FoodItem[] = names.map((name, index) => {
          const parts = name.split(',');
          return {
            id: `food-${index}-${Date.now()}`,
            name: parts[0]?.trim() || '',
            price: parts[1]?.trim(),
            description: parts[2]?.trim(),
            category: parts[3]?.trim() || '家常菜'
          };
        }).filter(item => item.name);
        
        generateSections(foodItems);
        setStep(2);
      } finally {
        setParsingWithAI(false);
        setLoading(false);
      }
    } else {
      // 没有AI客户端，直接解析
      const foodItems: FoodItem[] = names.map((name, index) => {
        const parts = name.split(',');
        return {
          id: `food-${index}-${Date.now()}`,
          name: parts[0]?.trim() || '',
          price: parts[1]?.trim(),
          description: parts[2]?.trim(),
          category: parts[3]?.trim() || '家常菜'
        };
      }).filter(item => item.name);
      
      generateSections(foodItems);
      setStep(2);
    }
  };

  // 解析AI返回的响应
  const parseAIResponse = (response: string): any[] => {
    try {
      // 尝试提取JSON数组
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('解析AI响应失败:', e);
    }
    return [];
  };

  // 生成菜单分组
  const generateSections = (foodItems: FoodItem[]) => {
    // 按分类分组
    const categoryGroups: { [key: string]: FoodItem[] } = {};
    foodItems.forEach(item => {
      const category = item.category || '家常菜';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(item);
    });
    
    // 定义分类排序顺序
    const categoryOrder = ['鱼类', '牛肉类', '虾类', '猪肉类', '猪肉类及其他肉', '家常菜', '时蔬类', '汤类'];
    
    // 按顺序排列分类
    const sortedCategories = Object.keys(categoryGroups).sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    const sections: MenuSection[] = [];
    
    sortedCategories.forEach((category, catIndex) => {
      const items = categoryGroups[category];
      const itemsPerSection = selectedTemplate.itemsPerSection;
      
      for (let i = 0; i < items.length; i += itemsPerSection) {
        const sectionFoodItems = items.slice(i, i + itemsPerSection);
        sections.push({
          id: `section-${catIndex}-${i}`,
          title: i === 0 ? category : '',
          foodItems: sectionFoodItems,
          layout: 'left-text-right-image'
        });
      }
    });
    
    setMenuSections(sections);
  };

  // 获取所有菜品
  const allFoodItems = menuSections.flatMap(section => section.foodItems);

  // 更新分组布局
  const updateSectionLayout = (sectionId: string, layout: MenuSection['layout']) => {
    setMenuSections(prev => 
      prev.map(section => 
        section.id === sectionId ? { ...section, layout } : section
      )
    );
  };

  // 处理分组图片上传
  const handleSectionImageUpload = (sectionId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setMenuSections(prev => 
        prev.map(section => 
          section.id === sectionId ? { ...section, imageUrl } : section
        )
      );
    };
    reader.readAsDataURL(file);
  };

  // 处理单道菜品图片上传
  const handleFoodItemImageUpload = (sectionId: string, foodItemId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setMenuSections(prev => 
        prev.map(section => 
          section.id === sectionId ? {
            ...section,
            foodItems: section.foodItems.map(item =>
              item.id === foodItemId ? { ...item, imageUrl } : item
            )
          } : section
        )
      );
    };
    reader.readAsDataURL(file);
  };

  // AI生成单道菜品图片
  const generateSingleFoodImage = async (sectionId: string, foodItem: FoodItem) => {
    const botId = process.env.NEXT_PUBLIC_COZE_BOT_ID;
    if (!cozeClient || !botId) {
      alert('请配置扣子API以使用AI生成功能');
      return;
    }

    setGeneratingImages(true);
    setThinkingContent([]);
    setCurrentThinking('');

    try {
      const styleMap = {
        realistic: '真实',
        photorealistic: '写实',
        cartoon: 'Q版'
      };

      const content = `请为以下菜品生成一张精美的菜品图片：\n菜品名称：${foodItem.name}\n价格：${foodItem.price || '未知'}元\n描述：${foodItem.description || '美味佳肴'}\n图片风格：${styleMap[imageStyle]}\n要求：突出菜品特色，色彩鲜艳，适合菜单展示`;

      setThinkingContent(prev => [...prev, `🤔 正在为「${foodItem.name}」生成图片...`]);

      const stream = await cozeClient.chat.stream({
        bot_id: botId,
        user_id: 'menu-generator-user',
        additional_messages: [
          {
            content: content,
            content_type: 'text',
            role: 'user',
            type: 'question'
          }
        ]
      });

      let fullResponse = '';
      let thinkingText = '';

      for await (const chunk of stream) {
        if (chunk.event !== 'conversation.message.completed') {
          if (chunk.data) {
            try {
              const data = typeof chunk.data === 'string' ? JSON.parse(chunk.data) : chunk.data;
              if (data.reasoning_content) {
                thinkingText += data.reasoning_content;
                setCurrentThinking(thinkingText);
              }
            } catch (e) {
              // ignore parse error
            }
          }
          continue;
        }

        if (chunk.data) {
          try {
            const data = typeof chunk.data === 'string' ? JSON.parse(chunk.data) : chunk.data;
            if (data.content) {
              fullResponse += data.content;
            }
          } catch (e) {
            // ignore parse error
          }
        }

        if (chunk.message?.content) {
          fullResponse += chunk.message.content;
        }
      }

      setThinkingContent(prev => [...prev.filter(c => !c.includes(`正在为「${foodItem.name}」生成图片`)), `✅ 「${foodItem.name}」图片生成完成`]);
      setCurrentThinking('');

      const imageUrl = extractImageUrlFromResponse(fullResponse);

      if (imageUrl) {
        setMenuSections(prev => 
          prev.map(section => 
            section.id === sectionId ? {
              ...section,
              foodItems: section.foodItems.map(item =>
                item.id === foodItem.id ? { ...item, imageUrl } : item
              )
            } : section
          )
        );
        setThinkingContent(prev => [...prev, `🖼️ 图片URL: ${imageUrl}`]);
      } else {
        setThinkingContent(prev => [...prev, `⚠️ 未获取到图片URL，使用演示图片`]);
        setMenuSections(prev => 
          prev.map(section => 
            section.id === sectionId ? {
              ...section,
              foodItems: section.foodItems.map(item =>
                item.id === foodItem.id ? { ...item, imageUrl: `https://picsum.photos/seed/${item.id}/400/300` } : item
              )
            } : section
          )
        );
      }
    } catch (error) {
      console.error('生成图片失败:', error);
      setThinkingContent(prev => [...prev, `❌ 「${foodItem.name}」生成失败: ${error}`]);
    } finally {
      setGeneratingImages(false);
    }
  };

  // AI生成图片（使用扣子SDK）
  const generateImagesWithAI = async () => {
    if (menuSections.length === 0) {
      alert('请先输入菜品名称');
      return;
    }

    const botId = process.env.NEXT_PUBLIC_COZE_BOT_ID;
    if (!cozeClient || !botId) {
      console.warn('扣子API未配置或未初始化，使用演示图片');
      await generateDemoImages();
      alert('演示图片生成成功！请配置扣子API以使用真实AI生成功能');
      return;
    }

    setGeneratingImages(true);
    setThinkingContent([]);
    setCurrentThinking('');
    
    try {
      const updatedSections = [...menuSections];
      
      for (let i = 0; i < updatedSections.length; i++) {
        const section = updatedSections[i];
        
        const foodDescription = section.foodItems
          .map(item => item.name)
          .join('、');
        
        const styleMap = {
          realistic: '真实',
          photorealistic: '写实',
          cartoon: 'Q版'
        };
        
        const content = `请为以下菜品生成一张精美的菜单图片：\n菜品：${foodDescription}\n图片风格：${styleMap[imageStyle]}\n布局：${section.layout}\n设计要求：${selectedTemplate.styleDesc}`;
        
        const thinkingHeader = `🤔 正在为第 ${i + 1} 组生成图片...`;
        setThinkingContent(prev => [...prev, thinkingHeader]);
        setCurrentThinking('');
        
        try {
          const stream = await cozeClient.chat.stream({
            bot_id: botId,
            user_id: 'menu-generator-user',
            additional_messages: [
              {
                content: content,
                content_type: 'text',
                role: 'user',
                type: 'question'
              }
            ]
          });
          
          let fullResponse = '';
          let thinkingText = '';
          
          for await (const chunk of stream) {
            console.log('📦 收到chunk:', JSON.stringify(chunk));
            
            const eventType = chunk.event;
            console.log('🔔 事件类型:', eventType);
            
            // 只处理 conversation.message.completed 事件
            if (eventType !== 'conversation.message.completed') {
              // delta事件：显示思考过程
              if (chunk.data) {
                try {
                  const data = typeof chunk.data === 'string' ? JSON.parse(chunk.data) : chunk.data;
                  if (data.reasoning_content) {
                    thinkingText += data.reasoning_content;
                    setCurrentThinking(thinkingText);
                    console.log('💭 思考内容:', thinkingText);
                  }
                } catch (e) {
                  console.log('❌ 解析delta数据失败:', e);
                }
              }
              continue;
            }
            
            // completed事件：获取图片URL
            if (chunk.data) {
              try {
                const data = typeof chunk.data === 'string' ? JSON.parse(chunk.data) : chunk.data;
                if (data.content) {
                  fullResponse += data.content;
                  console.log('📝 工具响应内容:', data.content);
                }
              } catch (e) {
                console.log('❌ 解析chunk数据失败:', e);
              }
            }
            
            // 兼容旧格式
            if (chunk.message?.content) {
              fullResponse += chunk.message.content;
              console.log('📨 消息内容:', chunk.message.content);
            }
          }
          
          console.log('✅ 完整响应:', fullResponse);
          
          setThinkingContent(prev => [...prev, `✅ 第 ${i + 1} 组思考完成:\n${fullResponse}`]);
          setCurrentThinking('');
          
          const imageUrl = extractImageUrlFromResponse(fullResponse);
          
          if (imageUrl) {
            updatedSections[i] = {
              ...section,
              imageUrl: imageUrl
            };
            setThinkingContent(prev => [...prev, `🖼️ 图片URL: ${imageUrl}`]);
          } else {
            console.warn('扣子API未返回图片URL');
          }
        } catch (error) {
          console.error('调用扣子API失败:', error);
          setThinkingContent(prev => [...prev, `❌ 第 ${i + 1} 组生成失败: ${error}`]);
          updatedSections[i] = {
            ...section,
            imageUrl: `https://picsum.photos/seed/${section.id}/600/400`
          };
        }
        
        setMenuSections([...updatedSections]);
      }
      
      setThinkingContent(prev => [...prev, '🎉 所有图片生成完成！']);
      alert('图片生成成功！');
    } catch (error) {
      console.error('生成图片失败:', error);
      setThinkingContent(prev => [...prev, `❌ 生成失败: ${error}`]);
      alert('生成图片失败，请重试');
    } finally {
      setGeneratingImages(false);
    }
  };

  // 从响应中提取图片URL
  const extractImageUrlFromResponse = (response: string): string | null => {
    console.log('🔍 正在解析响应:', response);
    
    try {
      const jsonData = JSON.parse(response);
      
      if (jsonData.data && jsonData.data.image_urls && Array.isArray(jsonData.data.image_urls)) {
        console.log('✅ 找到了 image_urls 格式');
        for (const url of jsonData.data.image_urls) {
          const cleanUrl = extractImageUrl(String(url));
          if (cleanUrl) {
            console.log('✅ 提取到图片URL:', cleanUrl);
            return cleanUrl;
          }
        }
      }
      
      if (jsonData.output && Array.isArray(jsonData.output)) {
        console.log('✅ 找到了 output 格式');
        for (const item of jsonData.output) {
          const url = extractImageUrl(String(item));
          if (url) {
            console.log('✅ 提取到图片URL:', url);
            return url;
          }
        }
      }
    } catch (e) {
      console.log('⚠️ 不是JSON格式，继续尝试其他方法:', e);
    }
    
    const cozePattern = /https:\/\/s\.coze\.cn\/t\/[a-zA-Z0-9]+/i;
    const cozeMatch = response.match(cozePattern);
    if (cozeMatch) {
      console.log('✅ 通过正则匹配提取到图片URL:', cozeMatch[0]);
      return cozeMatch[0];
    }
    
    const urlPattern = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i;
    const match = response.match(urlPattern);
    if (match) {
      console.log('✅ 通过标准URL匹配提取到图片URL:', match[0]);
      return match[0];
    }
    
    console.log('❌ 未能提取到图片URL');
    return null;
  };

  const extractImageUrl = (response: string): string | null => {
    const cozePattern = /https:\/\/s\.coze\.cn\/t\/[a-zA-Z0-9]+/i;
    const cozeMatch = response.match(cozePattern);
    if (cozeMatch) {
      return cozeMatch[0];
    }
    
    const urlPattern = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i;
    const match = response.match(urlPattern);
    return match ? match[0] : null;
  };

  // 生成演示图片
  const generateDemoImages = async () => {
    const updatedSections = [...menuSections];
    
    for (let i = 0; i < updatedSections.length; i++) {
      const section = updatedSections[i];
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      updatedSections[i] = {
        ...section,
        imageUrl: `https://picsum.photos/seed/${section.id}/600/400`
      };
      
      setMenuSections([...updatedSections]);
    }
  };

  // 生成PDF预览
  const generatePDFPreview = () => {
    setPreviewMode(true);
    setStep(4);
  };

  // 下载PDF
  const downloadPDF = () => {
    window.print();
  };

  // 修改模板
  const handleTemplateChange = (template: Template) => {
    setSelectedTemplate(template);
    if (allFoodItems.length > 0) {
      generateSections(allFoodItems);
    }
  };

  return (
    <PermissionGuard requireLogin>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          
          @page {
            size: A4;
            margin: 0;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0;
            padding: 0;
          }
          
          #print-area > div {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 8mm !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
          }
          
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            filter: none !important;
            max-width: 100% !important;
            height: auto !important;
          }
          
          .bg-white, .bg-gray-50, .bg-gray-100, .bg-orange-50, .bg-purple-50, 
          .bg-amber-50, .bg-slate-50, .bg-rose-50, .bg-lime-50, .bg-teal-50, 
          .bg-indigo-50, .bg-gradient-to-br {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          button, select, input {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">菜单生成器</h1>
          
          <div className="flex items-center space-x-4 mb-8 no-print">
            {['输入菜品', '设置布局', '生成图片', '预览下载'].map((label, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step > index + 1 ? 'bg-green-500 text-white' :
                  step === index + 1 ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step > index + 1 ? '✓' : index + 1}
                </div>
                <span className={`ml-2 text-sm ${step >= index + 1 ? 'text-gray-700' : 'text-gray-400'}`}>
                  {label}
                </span>
                {index < 3 && (
                  <div className={`w-8 h-0.5 mx-4 ${step > index + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          {/* 步骤1: 输入菜品名称 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">步骤1: 输入菜品名称</h2>
                <p className="text-gray-500 text-sm mb-4">每行输入一个菜品名称，AI会自动补充价格和描述信息</p>
                <textarea
                  value={foodNamesInput}
                  onChange={(e) => setFoodNamesInput(e.target.value)}
                  placeholder="宫保鸡丁&#10;麻婆豆腐&#10;红烧肉&#10;水煮鱼"
                  className="w-full h-40 border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={parseFoodNames}
                    disabled={!foodNamesInput.trim() || parsingWithAI}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {parsingWithAI ? '🤖 AI处理中...' : '下一步：设置布局 →'}
                  </button>
                </div>
              </div>

              {/* AI思考过程 */}
              {(parsingWithAI || thinkingContent.length > 0) && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-700 mb-4">🧠 AI处理过程</h2>
                  <div 
                    ref={thinkingContainerRef}
                    className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto"
                  >
                    {thinkingContent.map((content, index) => (
                      <div key={index} className="mb-3 text-sm text-gray-700 whitespace-pre-wrap">
                        {content}
                      </div>
                    ))}
                    
                    {currentThinking && (
                      <div className="mb-3 text-sm text-blue-600 whitespace-pre-wrap animate-pulse">
                        <span className="inline-block mr-2">💭</span>
                        {currentThinking}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 步骤2: 选择模板 */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-700">步骤2: 自定义菜单标题</h2>
                  <button
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
                  >
                    ← 返回编辑菜品
                  </button>
                </div>
                
                <div className="mt-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">菜单标题</label>
                    <input
                      type="text"
                      value={menuTitle}
                      onChange={(e) => setMenuTitle(e.target.value)}
                      placeholder="请输入菜单标题"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">副标题（可选）</label>
                    <input
                      type="text"
                      value={menuSubtitle}
                      onChange={(e) => setMenuSubtitle(e.target.value)}
                      placeholder="请输入副标题"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">选择模板</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateChange(template)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedTemplate.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h3 className="font-medium text-gray-700">{template.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      <p className="text-xs text-gray-400 mt-2">{template.styleDesc}</p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setStep(3)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    下一步：预览与编辑 →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 步骤3: 预览与编辑 */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6 no-print">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-700">步骤3: 预览与编辑</h2>
                  <div className="space-x-4">
                    <select
                      value={selectedTemplate.id}
                      onChange={(e) => {
                        const template = templates.find(t => t.id === e.target.value);
                        if (template) handleTemplateChange(template);
                      }}
                      className="px-4 py-2 border rounded-lg"
                    >
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>{template.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setStep(2)}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      ← 返回选择模板
                    </button>
                    <button
                      onClick={downloadPDF}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      📥 下载PDF
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center gap-4">
                  <label className="block text-sm font-medium text-gray-700">图片风格：</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="imageStyle"
                        value="realistic"
                        checked={imageStyle === 'realistic'}
                        onChange={(e) => setImageStyle('realistic')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">真实</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="imageStyle"
                        value="photorealistic"
                        checked={imageStyle === 'photorealistic'}
                        onChange={(e) => setImageStyle('photorealistic')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">写实</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="imageStyle"
                        value="cartoon"
                        checked={imageStyle === 'cartoon'}
                        onChange={(e) => setImageStyle('cartoon')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Q版</span>
                    </label>
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 mt-4">💡 鼠标悬停在图片位置可以上传图片或使用AI生成</p>
              </div>

              {(generatingImages || thinkingContent.length > 0) && (
                <div className="bg-white rounded-lg shadow p-6 no-print">
                  <h2 className="text-xl font-semibold text-gray-700 mb-4">🧠 AI处理过程</h2>
                  <div 
                    ref={thinkingContainerRef}
                    className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto"
                  >
                    {thinkingContent.map((content, index) => (
                      <div key={index} className="mb-3 text-sm text-gray-700 whitespace-pre-wrap">
                        {content}
                      </div>
                    ))}
                    
                    {currentThinking && (
                      <div className="mb-3 text-sm text-blue-600 whitespace-pre-wrap animate-pulse">
                        <span className="inline-block mr-2">💭</span>
                        {currentThinking}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div id="print-area" className="space-y-0">
                {(() => {
                  const pages = [];
                  const sectionsPerPage = selectedTemplate.sectionsPerPage;
                  const totalPages = Math.ceil(menuSections.length / sectionsPerPage);
                  
                  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                    const startSection = pageIndex * sectionsPerPage;
                    const endSection = startSection + sectionsPerPage;
                    const pageSections = menuSections.slice(startSection, endSection);
                    
                    pages.push(
                      <div 
                        key={`page-${pageIndex}`}
                        className={`${selectedTemplate.bgColor} ${selectedTemplate.textColor} min-h-[297mm] w-[210mm] mx-auto p-8 print:m-0 print:p-8 print:min-h-[297mm] print:w-full break-after-page shadow-lg relative`}
                        style={{ boxSizing: 'border-box' }}
                      >
                        <div className="text-center mb-8">
                          <h1 className={`text-4xl font-bold ${
                            selectedTemplate.headerStyle === 'elegant' ? 'font-serif' :
                            selectedTemplate.headerStyle === 'modern' ? 'font-sans' : 'font-serif'
                          } ${selectedTemplate.headerStyle === 'traditional' ? 'text-red-800' : 'text-gray-800'}`}>
                            {menuTitle || '精美食谱'}
                          </h1>
                          {menuSubtitle && <p className="text-gray-500 mt-2">{menuSubtitle}</p>}
                        </div>

                        <div className="space-y-6">
                          {pageSections.map((section, sectionIndex) => (
                            <div key={section.id}>
                              {selectedTemplate.id === 't1' && (
                                <div className="border border-gray-200 rounded-lg p-4">
                                  <div className="space-y-3">
                                    {section.foodItems.map((item, idx) => (
                                      <div key={item.id} className="flex gap-4 items-center">
                                        <div className="flex-1">
                                          <div className="flex justify-between items-center">
                                            <span className="text-gray-800 font-medium">{item.name}</span>
                                            {item.price && selectedTemplate.showPrice && (
                                              <span className="text-orange-600 font-semibold">¥{item.price}</span>
                                            )}
                                          </div>
                                          {item.description && selectedTemplate.showDescription && (
                                            <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                                          )}
                                        </div>
                                        <div className="w-24">
                                          <ImageEditor 
                                            sectionId={section.id}
                                            foodItem={item}
                                            imageUrl={item.imageUrl}
                                            onUpload={handleFoodItemImageUpload}
                                            onAIGenerate={generateSingleFoodImage}
                                            generating={generatingImages}
                                            className="h-16"
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedTemplate.id === 't2' && (
                                <div className="border border-gray-200 rounded-lg p-4">
                                  <div className="mb-4">
                                    <MainImageSelector
                                      section={section}
                                      onSelect={(foodItem) => {
                                        if (foodItem) {
                                          const input = document.createElement('input');
                                          input.type = 'file';
                                          input.accept = 'image/*';
                                          input.onchange = (e) => {
                                            const files = (e.target as HTMLInputElement).files;
                                            if (files?.[0]) handleFoodItemImageUpload(section.id, foodItem.id, files[0]);
                                          };
                                          input.click();
                                        }
                                      }}
                                      onAIGenerate={(foodItem) => {
                                        if (foodItem) generateSingleFoodImage(section.id, foodItem);
                                      }}
                                      generating={generatingImages}
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    {section.foodItems.map((item, idx) => (
                                      <div key={item.id} className="flex justify-between items-start p-2 bg-gray-50 rounded">
                                        <div>
                                          <span className="text-gray-800 font-medium">{item.name}</span>
                                          {item.description && <p className="text-xs text-gray-400">{item.description}</p>}
                                        </div>
                                        {item.price && <span className="text-orange-600 font-semibold">¥{item.price}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedTemplate.id === 't3' && (
                                <div className="border border-gray-200 rounded-lg p-4">
                                  <div className="text-center">
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 max-w-3xl mx-auto">
                                      {section.foodItems.map((item, idx) => (
                                        <div key={item.id} className="flex justify-between py-1">
                                          <span className="text-gray-800">{item.name}</span>
                                          {item.price && <span className="text-orange-600">¥{item.price}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {selectedTemplate.id === 't4' && (
                                <div className="border border-gray-200 rounded-lg p-4">
                                  <div className="mb-3">
                                    <MainImageSelector
                                      section={section}
                                      onSelect={(foodItem) => {
                                        if (foodItem) {
                                          const input = document.createElement('input');
                                          input.type = 'file';
                                          input.accept = 'image/*';
                                          input.onchange = (e) => {
                                            const files = (e.target as HTMLInputElement).files;
                                            if (files?.[0]) handleFoodItemImageUpload(section.id, foodItem.id, files[0]);
                                          };
                                          input.click();
                                        }
                                      }}
                                      onAIGenerate={(foodItem) => {
                                        if (foodItem) generateSingleFoodImage(section.id, foodItem);
                                      }}
                                      generating={generatingImages}
                                      className="h-48"
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {section.foodItems.map((item, idx) => (
                                      <div key={item.id} className="text-center p-2 border rounded">
                                        <h4 className="text-gray-800 text-sm">{item.name}</h4>
                                        {item.price && <p className="text-orange-600 font-semibold text-sm">¥{item.price}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedTemplate.id === 't5' && (
                                <div className="grid grid-cols-3 gap-3">
                                  {section.foodItems.map((item, idx) => (
                                    <div key={item.id} className="border rounded-lg overflow-hidden">
                                      <ImageEditor 
                                        sectionId={section.id}
                                        foodItem={item}
                                        imageUrl={item.imageUrl}
                                        onUpload={handleFoodItemImageUpload}
                                        onAIGenerate={generateSingleFoodImage}
                                        generating={generatingImages}
                                        className="h-32"
                                      />
                                      <div className="p-2 text-center">
                                        <h4 className="text-gray-800 text-sm">{item.name}</h4>
                                        {item.price && <p className="text-orange-600 font-semibold text-sm">¥{item.price}</p>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {selectedTemplate.id === 't6' && (
                                <div className="grid grid-cols-2 gap-3">
                                  {section.foodItems.map((item, idx) => (
                                    <ImageEditor 
                                      key={item.id}
                                      sectionId={section.id}
                                      foodItem={item}
                                      imageUrl={item.imageUrl}
                                      onUpload={handleFoodItemImageUpload}
                                      onAIGenerate={generateSingleFoodImage}
                                      generating={generatingImages}
                                      className="h-44 rounded-lg"
                                      overlayContent={
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                                          <div>
                                            <h4 className="text-white font-bold">{item.name}</h4>
                                            {item.price && <p className="text-orange-400 text-sm">¥{item.price}</p>}
                                          </div>
                                        </div>
                                      }
                                    />
                                  ))}
                                </div>
                              )}

                              {selectedTemplate.id === 't7' && (
                                <div className="border-2 border-gray-800 rounded-lg p-4 bg-gradient-to-br from-amber-50 to-amber-100">
                                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                                    {section.foodItems.map((item, idx) => (
                                      <div key={item.id} className="flex justify-between py-1">
                                        <span className="text-gray-700">{item.name}</span>
                                        {item.price && <span className="text-red-600 font-bold">¥{item.price}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedTemplate.id === 't8' && (
                                <div className="border border-gray-200 rounded-lg p-4">
                                  <div className="w-12 h-0.5 bg-gray-300 mb-3"></div>
                                  <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
                                    {section.foodItems.map((item, idx) => (
                                      <div key={item.id} className="flex justify-between items-baseline">
                                        <span className="text-gray-700 text-sm">{item.name}</span>
                                        {item.price && <span className="text-gray-500 text-sm">¥{item.price}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedTemplate.id === 't9' && (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <MainImageSelector
                                    section={section}
                                    onSelect={(foodItem) => {
                                      if (foodItem) {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = (e) => {
                                          const files = (e.target as HTMLInputElement).files;
                                          if (files?.[0]) handleFoodItemImageUpload(section.id, foodItem.id, files[0]);
                                        };
                                        input.click();
                                      }
                                    }}
                                    onAIGenerate={(foodItem) => {
                                      if (foodItem) generateSingleFoodImage(section.id, foodItem);
                                    }}
                                    generating={generatingImages}
                                    className="h-64"
                                    showOverlay
                                  />
                                  <div className="p-4">
                                    <div className="grid grid-cols-3 gap-2">
                                      {section.foodItems.map((item, idx) => (
                                        <div key={item.id} className="text-center p-2 bg-gray-50 rounded">
                                          <h4 className="text-gray-800 text-sm">{item.name}</h4>
                                          {item.price && <p className="text-orange-600 font-semibold text-sm">¥{item.price}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {selectedTemplate.id === 't10' && (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <div className="grid grid-cols-4 gap-0">
                                    <div className="bg-gray-800 text-white p-3 text-center">
                                      <span className="font-bold">菜品</span>
                                    </div>
                                    <div className="col-span-3 p-2">
                                      <div className="grid grid-cols-2 gap-1">
                                        {section.foodItems.map((item, idx) => (
                                          <div key={item.id} className="flex justify-between items-center px-2 py-1 bg-gray-50 rounded">
                                            <span className="text-sm">{item.name}</span>
                                            {item.price && <span className="text-orange-600 text-sm">¥{item.price}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {selectedTemplate.id === 't11' && (
                                <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                                  {section.foodItems.slice(0, 2).map((item, idx) => (
                                    <div key={item.id} className={`flex gap-3 ${idx % 2 === 1 ? 'flex-row-reverse' : ''}`}>
                                      <div className="w-1/2">
                                        <ImageEditor 
                                          sectionId={section.id}
                                          foodItem={item}
                                          imageUrl={item.imageUrl}
                                          onUpload={handleFoodItemImageUpload}
                                          onAIGenerate={generateSingleFoodImage}
                                          generating={generatingImages}
                                          className="h-36"
                                        />
                                      </div>
                                      <div className="w-1/2 flex flex-col justify-center">
                                        <h4 className="text-lg font-bold text-gray-800">{item.name}</h4>
                                        {item.price && <p className="text-orange-600 font-semibold">¥{item.price}</p>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {selectedTemplate.id === 't12' && (
                                <div className="border border-gray-200 rounded-lg p-4">
                                  <div className="flex gap-4">
                                    <div className="flex-1">
                                      <MainImageSelector
                                        section={section}
                                        onSelect={(foodItem) => {
                                          if (foodItem) {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = (e) => {
                                              const files = (e.target as HTMLInputElement).files;
                                              if (files?.[0]) handleFoodItemImageUpload(section.id, foodItem.id, files[0]);
                                            };
                                            input.click();
                                          }
                                        }}
                                        onAIGenerate={(foodItem) => {
                                          if (foodItem) generateSingleFoodImage(section.id, foodItem);
                                        }}
                                        generating={generatingImages}
                                        className="h-40"
                                      />
                                    </div>
                                    <div className="w-1/2 space-y-1">
                                      {section.foodItems.map((item, idx) => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                          <span className="text-gray-700">{item.name}</span>
                                          {item.price && <span className="text-gray-500">¥{item.price}</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {pageIndex === totalPages - 1 && (
                          <div className="text-center mt-12 pt-8 border-t border-gray-200">
                            <p className="text-gray-400 text-sm">感谢您的光临 · 期待下次再见</p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  
                  return pages;
                })()}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>
    </PermissionGuard>
  );
}