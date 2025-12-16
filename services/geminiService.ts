
import { ApiConfig, AnalyzeOptions, StoryboardData, Character, ComicData } from '../types';

let apiConfigs: Record<string, ApiConfig> = {
  gemini: {
    baseUrl: "https://grsai.dakka.com.cn",
    apiKey: "",
    textModel: "gemini-3-pro",
    imageModel: "nano-banana-pro",
    videoModel: "Sora2-pro",
    provider: 'gemini'
  }
};

let currentApiConfig: ApiConfig = apiConfigs.gemini;

export const setApiConfig = (config: ApiConfig) => {
  // 保存配置到配置列表
  apiConfigs[config.provider] = config;
  // 设置为当前使用的配置
  currentApiConfig = config;
  
  // 保存所有配置到 localStorage
  localStorage.setItem('yesir_api_configs', JSON.stringify(apiConfigs));
};

// 批量设置所有配置
export const setAllApiConfigs = (configs: Record<string, ApiConfig>) => {
  apiConfigs = configs;
  // 确保当前配置存在，如果不存在则设置为第一个配置
  if (!currentApiConfig || !apiConfigs[currentApiConfig.provider]) {
    const providers = Object.keys(apiConfigs);
    if (providers.length > 0) {
      currentApiConfig = apiConfigs[providers[0]];
    }
  }
};

export const getApiConfig = () => currentApiConfig;

export const getAllApiConfigs = () => apiConfigs;

// 从 localStorage 加载所有配置
const loadApiConfigs = () => {
  try {
    const savedConfigs = localStorage.getItem('yesir_api_configs');
    if (savedConfigs) {
      apiConfigs = JSON.parse(savedConfigs);
      // 设置当前配置为第一个可用配置
      const providers = Object.keys(apiConfigs);
      if (providers.length > 0) {
        currentApiConfig = apiConfigs[providers[0]];
      }
    } else {
      // 检查是否有旧的单个配置需要迁移
      const oldConfig = localStorage.getItem('yesir_api_config');
      if (oldConfig) {
        const parsed = JSON.parse(oldConfig);
        apiConfigs[parsed.provider] = parsed;
        currentApiConfig = parsed;
        // 保存为新格式
        localStorage.setItem('yesir_api_configs', JSON.stringify(apiConfigs));
        // 删除旧格式
        localStorage.removeItem('yesir_api_config');
      }
    }
  } catch (e) {
    console.error('Failed to load API configs:', e);
  }
};

// 初始化加载配置
loadApiConfigs();

const getEndpoint = (path: string) => {
    let base = currentApiConfig.baseUrl || "https://grsai.dakka.com.cn";
    if (base.endsWith('/')) base = base.slice(0, -1);
    
    let cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Fix for double v1: if base ends in /v1 and path starts with v1/, remove it from path
    if (base.endsWith('/v1') && cleanPath.startsWith('v1/')) {
        cleanPath = cleanPath.slice(3);
    }
    
    return `${base}/${cleanPath}`;
};

const getHeaders = (key?: string) => {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key || currentApiConfig.apiKey}`
    };
};

// 平台可用性检查缓存，用于记录最近失败的平台
const platformAvailability: Record<string, boolean> = {};

// 平台优先级顺序，用于自动切换
const platformPriority: string[] = ['yunwu', 'gemini', 't8star', 'tuzi'];

// 切换到下一个可用平台
const switchToNextPlatform = (): ApiConfig => {
    // 获取所有配置的平台列表
    const configuredProviders = Object.keys(apiConfigs);
    
    // 如果只有一个配置，直接返回
    if (configuredProviders.length === 1) {
        return apiConfigs[configuredProviders[0]];
    }
    
    // 找到当前平台在优先级列表中的位置
    const currentIndex = platformPriority.indexOf(currentApiConfig.provider);
    
    // 按优先级顺序查找下一个可用平台
    for (let i = 1; i < platformPriority.length; i++) {
        const nextIndex = (currentIndex + i) % platformPriority.length;
        const nextProvider = platformPriority[nextIndex];
        
        // 检查平台是否已配置且可用
        if (apiConfigs[nextProvider] && platformAvailability[nextProvider] !== false) {
            // 更新当前配置
            currentApiConfig = apiConfigs[nextProvider];
            return currentApiConfig;
        }
    }
    
    // 如果按优先级没有找到可用平台，尝试使用其他已配置的平台
    for (const provider of configuredProviders) {
        if (provider !== currentApiConfig.provider && platformAvailability[provider] !== false) {
            currentApiConfig = apiConfigs[provider];
            return currentApiConfig;
        }
    }
    
    // 如果所有平台都不可用，返回当前配置
    return currentApiConfig;
};

export const generateTextTest = async () => {
    // 尝试使用当前平台，失败则切换到下一个平台
    const maxAttempts = 3;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(getEndpoint('/v1/chat/completions'), {
               method: 'POST',
               headers: getHeaders(),
               body: JSON.stringify({
                   model: currentApiConfig.textModel,
                   messages: [{ role: "user", content: "Hello" }],
                   max_tokens: 5
               })
           });
           
           if (!response.ok) {
               let errorDetail = response.statusText;
               try {
                   const errData = await response.json();
                   if (errData.error?.message) errorDetail = errData.error.message;
                   else if (errData.message) errorDetail = errData.message;
               } catch {}
               
               // 记录当前平台为不可用
               platformAvailability[currentApiConfig.provider] = false;
               
               // 提示用户选择其他平台
               throw new Error(`当前平台 ${currentApiConfig.provider} 调用失败: ${errorDetail}，请尝试选择其他平台`);
           }
           
           // 记录当前平台为可用
           platformAvailability[currentApiConfig.provider] = true;
           
           return;
        } catch (error: any) {
            attempts++;
            if (attempts < maxAttempts) {
                // 切换到下一个平台
                console.log(`切换到下一个平台，当前尝试次数：${attempts}`);
                switchToNextPlatform();
            } else {
                // 所有平台都尝试失败，抛出最终错误
                throw new Error(`所有平台调用失败：${error.message}`);
            }
        }
    }
    
    // 理论上不会到达这里
    throw new Error("未知错误");
};

export const analyzeScript = async (text: string, options: AnalyzeOptions): Promise<StoryboardData> => {
    // 处理@形式调用的角色，将其转换为实际角色名称
    let processedText = text;
    if (options.libraryCharacters && options.libraryCharacters.length > 0) {
        options.libraryCharacters.forEach(character => {
            const regex = new RegExp(`@${character.name}`, 'g');
            processedText = processedText.replace(regex, character.name);
        });
    }
    
    const prompt = `
    请严格按照以下步骤处理用户输入的内容：
    
    ## 步骤1：分析用户需求
    分析用户输入的文本，提取以下信息：
    - 出演角色：从输入中提取角色名称${options.libraryCharacters && options.libraryCharacters.length > 0 ? '，或使用角色库中的角色（如@形式调用）' : ''}
    - 题材类型：直接从文案中提取
    - 画面风格：直接从文案中提取
    - 比例大小：使用提供的${options.aspectRatio}比例
    - 生成模式：${options.mode === 'divergent' ? '分散模式（可对文案扩写、润色）' : '逻辑模式'}
    - 分镜数量：${options.shotCountMode === 'custom' ? options.customShotCount : '根据内容自动生成'}
    
    ## 步骤2：生成完整剧本
    严格按照用户设定的参数，生成完整的中文剧本，包括：
    - 标题
    - 简介
    - 完整的故事情节
    - 人物对话和旁白
    - 场景描述
    
    ## 步骤3：生成分镜脚本
    基于完整剧本，生成详细的分镜脚本，每个分镜必须包含：
    - 运镜方式
    - 景别
    - 时长
    - 音效
    - 对话/旁白
    - 文生图提示词（中文）
    - 图生视频提示词（中文）
    - 文生视频提示词（中文）
    
    ## 执行要求
    - 必须严格按照设定要求执行，严禁自由发挥
    - 全部使用中文输出，除非用户明确要求英文
    ${options.libraryCharacters && options.libraryCharacters.length > 0 ? '- 必须使用提供的角色库中的角色（如果有@形式调用）' : ''}
    - 题材类型、画面风格必须严格按照文案中的设定
    - 比例大小必须使用${options.aspectRatio}
    - 生成模式必须使用${options.mode === 'divergent' ? '分散模式' : '逻辑模式'}
    - 分镜数量必须按照设定：${options.shotCountMode === 'custom' ? options.customShotCount : '自动生成'}
    
    ## 输入文本
    ${processedText}
    
    ## 角色库
    ${options.libraryCharacters ? JSON.stringify(options.libraryCharacters) : '无'}
    
    ## 输出格式
    请输出符合以下格式的JSON：
    {
      "title": "剧本标题",
      "synopsis": "剧本简介",
      "characters": [ { "id": "1", "name": "角色名称", "gender": "性别", "age": "年龄", "subjectDescription": "角色描述", "visualPrompt": "角色视觉提示词", "personality": "角色性格", "background": "角色背景" } ],
      "scenes": [ { "location": "场景位置", "mood": "场景氛围", "timeOfDay": "时间", "visualPrompt": "场景视觉提示词" } ],
      "shots": [
         {
           "id": 1,
           "shotNumber": 1,
           "contentZh": "分镜内容（中文）",
           "contentEn": "",
           "visualDescriptionZh": "视觉描述（中文）",
           "visualDescriptionEn": "",
           "shotSize": "景别（如：Close-up (特写)）",
           "cameraMovement": "运镜方式（如：Static (固定)）",
           "t2iPrompt": "文生图提示词（中文）",
           "t2iPromptEn": "",
           "i2vPrompt": "图生视频提示词（中文）",
           "i2vPromptEn": "",
           "t2vPrompt": "文生视频提示词（中文）",
           "t2vPromptEn": "",
           "narrationZh": "旁白（中文）",
           "narrationEn": "",
           "duration": "时长（如：5s）",
           "audioPromptZh": "音效（中文）",
           "audioPromptEn": ""
         }
      ]
    }
    
    请严格按照上述格式输出，只返回JSON，不要添加任何其他内容。
    `;

    // 尝试使用当前平台，失败则切换到下一个平台
    const maxAttempts = 3;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const response = await fetch(getEndpoint('/v1/chat/completions'), {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    model: currentApiConfig.textModel,
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });

            if (!response.ok) {
                const err = await response.text();
                // 记录当前平台为不可用
                platformAvailability[currentApiConfig.provider] = false;
                throw new Error(`当前平台 ${currentApiConfig.provider} 调用失败: ${err}，请尝试选择其他平台`);
            }
            
            // 记录当前平台为可用
            platformAvailability[currentApiConfig.provider] = true;
            
            const data = await response.json();
            const content = data.choices[0].message.content;
            try {
                return JSON.parse(content);
            } catch (e) {
                const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
                if (jsonMatch) return JSON.parse(jsonMatch[1]);
                const bracketMatch = content.match(/\{[\s\S]*\}/);
                if (bracketMatch) return JSON.parse(bracketMatch[0]);
                throw new Error("Failed to parse JSON response");
            }
        } catch (error: any) {
            attempts++;
            if (attempts < maxAttempts) {
                // 切换到下一个平台
                console.log(`切换到下一个平台，当前尝试次数：${attempts}`);
                switchToNextPlatform();
            } else {
                // 所有平台都尝试失败，抛出最终错误
                throw new Error(`所有平台调用失败：${error.message}`);
            }
        }
    }
    
    // 理论上不会到达这里
    throw new Error("未知错误");
};

export const generateImage = async (prompt: string, aspectRatio: string, model?: string, count: number = 1, refImage?: string, maskImage?: string): Promise<string> => {
    // Determine size based on aspect ratio
    let size = '1024x1024';
    if (aspectRatio === '16:9') size = '1024x576';
    else if (aspectRatio === '9:16') size = '576x1024';
    else if (aspectRatio === '3:4') size = '768x1024';
    else if (aspectRatio === '4:3') size = '1024x768';

    // 只使用用户选择的平台和模型，不自动切换
    // 优先使用用户指定的模型，否则使用配置中的模型
    const currentModel = model || currentApiConfig.imageModel || 'nano-banana-pro';
    const provider = currentApiConfig.provider;
    
    // 调用结果
    let response: Response;
    let data: any;
    
    // 记录API调用信息
    console.log('调用API生成图片:', {
        provider,
        model: currentModel,
        prompt,
        size,
        endpoint: currentApiConfig.provider === 'gemini' && (currentModel === 'nano-banana-pro' || currentModel === 'nano-banana') ? '/v1/draw/nano-banana' : '/v1/images/generations'
    });
    
    // 记录当前API配置
    console.log('当前API配置:', currentApiConfig);
    
    // 根据不同平台使用不同的API调用逻辑
    let endpoint: string;
    let requestBody: any;
    
    if (currentApiConfig.provider === 'gemini' && (currentModel === 'nano-banana-pro' || currentModel === 'nano-banana')) {
        endpoint = '/v1/draw/nano-banana';
        requestBody = {
            prompt: prompt,
            size: size,
            model: currentModel
        };
    } else {
        endpoint = '/v1/images/generations';
        requestBody = {
            model: currentModel,
            prompt: prompt,
            n: 1,
            size: size
        };
    }
    
    const fullEndpoint = getEndpoint(endpoint);
    console.log('完整API地址:', fullEndpoint);
    console.log('请求体:', requestBody);
    
    // 发送API请求
    response = await fetch(fullEndpoint, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(requestBody)
    });
    
    // 记录响应状态
    console.log('响应状态:', response.status, response.statusText);
    console.log('响应头:', Object.fromEntries(response.headers.entries()));
    
    // 检查响应状态
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`当前平台 ${provider} 图片生成失败: ${response.status} ${response.statusText}，请尝试选择其他平台`);
    }
    
    // 解析响应数据 - 处理可能的非JSON响应
    const contentType = response.headers.get('Content-Type');
    let responseData: any;
    let textResponse: string | null = null;
    
    try {
        // 特别处理Gemini平台的响应
        if (currentApiConfig.provider === 'gemini') {
            console.log('特别处理Gemini平台响应');
            
            // 先读取文本响应，避免body stream already read错误
            textResponse = await response.text();
            console.log('Gemini响应文本:', textResponse);
            
            // 检查是否直接是图片URL或base64
            if (textResponse.startsWith('http') || textResponse.startsWith('data:image')) {
                console.log('Gemini直接返回图片URL:', textResponse);
                return textResponse;
            }
            
            // 处理Gemini平台的特殊响应格式
            // 1. 处理流式响应格式 (data: {...})
            if (textResponse.startsWith('data: ')) {
                console.log('处理Gemini流式响应');
                
                // 提取所有JSON对象
                const jsonObjects: any[] = [];
                const lines = textResponse.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6).trim();
                        if (jsonStr) {
                            try {
                                const jsonObj = JSON.parse(jsonStr);
                                jsonObjects.push(jsonObj);
                            } catch (e) {
                                console.log('解析单行JSON失败:', jsonStr, '错误:', e);
                                // 尝试提取JSON对象
                                const jsonRegex = /\{[\s\S]*?\}/;
                                const match = jsonStr.match(jsonRegex);
                                if (match) {
                                    try {
                                        const jsonObj = JSON.parse(match[0]);
                                        jsonObjects.push(jsonObj);
                                    } catch (e2) {
                                        console.log('提取JSON对象失败:', match[0], '错误:', e2);
                                    }
                                }
                            }
                        }
                    }
                }
                
                console.log('解析到的JSON对象数量:', jsonObjects.length);
                
                if (jsonObjects.length > 0) {
                    // 使用最后一个JSON对象（通常是最新状态）
                    responseData = jsonObjects[jsonObjects.length - 1];
                    console.log('使用最后一个JSON对象:', responseData);
                    
                    // 处理生成状态
                    if (responseData.status === 'running' && responseData.results === null) {
                        throw new Error(`当前平台 ${provider} 图片生成失败: 生成任务仍在运行中，请稍后重试`);
                    }
                    if (responseData.status === 'failed' || responseData.status === 'error') {
                        const errorMsg = responseData.failure_reason || responseData.error || '生成失败';
                        throw new Error(`当前平台 ${provider} 图片生成失败: ${errorMsg}`);
                    }
                }
            }
            // 2. 处理正常JSON响应
            else if (contentType && contentType.includes('application/json')) {
                console.log('处理Gemini JSON响应');
                responseData = JSON.parse(textResponse);
                console.log('Gemini JSON响应:', responseData);
            }
            // 3. 处理文本响应（可能直接包含URL）
            else {
                console.log('处理Gemini文本响应');
                // 尝试提取URL
                const urlRegex = /https?:\/\/[^\s"'\}]+/g;
                const matches = textResponse.match(urlRegex);
                if (matches && matches.length > 0) {
                    const cleanMatch = matches[0].replace(/[\",'}\]]*$/, '');
                    console.log('从Gemini文本响应中提取到URL:', cleanMatch);
                    return cleanMatch;
                }
                // 直接返回文本响应
                console.log('直接返回Gemini文本响应:', textResponse);
                return textResponse;
            }
        }
        // 非Gemini平台响应处理
        else {
            if (contentType && contentType.startsWith('image/')) {
                // 直接返回图片数据URL
                const blob = await response.blob();
                return URL.createObjectURL(blob);
            } else {
                // 先读取文本响应，避免body stream already read错误
                textResponse = await response.text();
                
                console.log('非Gemini响应文本:', textResponse);
                
                if (textResponse.startsWith('data:image')) {
                    // 直接返回base64图片
                    return textResponse;
                }
                
                // 处理以 'data: ' 开头的流式响应格式
                if (textResponse.startsWith('data: ')) {
                    // 提取JSON部分
                    let jsonStr = textResponse.substring(6).trim();
                    
                    console.log('提取的JSON字符串:', jsonStr);
                    
                    // 处理可能的多个JSON对象或格式问题
                    if (jsonStr) {
                        // 尝试找到第一个完整的JSON对象
                        try {
                            // 寻找第一个'{'和最后一个'}'
                            const firstBrace = jsonStr.indexOf('{');
                            const lastBrace = jsonStr.lastIndexOf('}');
                            
                            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                                // 提取完整的JSON部分
                                const completeJson = jsonStr.substring(firstBrace, lastBrace + 1);
                                responseData = JSON.parse(completeJson);
                                console.log('从流式响应中提取的JSON:', responseData);
                                
                                // 处理生成中的状态
                                if (responseData && responseData.status === 'running' && responseData.results === null) {
                                    // 处理正在生成的情况 - 这是一个流式响应，需要轮询
                                    // 但当前实现是一次性请求，所以我们需要等待或返回错误
                                    throw new Error(`当前平台 ${provider} 图片生成失败: 生成任务仍在运行中，请稍后重试`);
                                }
                            } else {
                                // 尝试直接解析
                                responseData = JSON.parse(jsonStr);
                                console.log('直接解析流式响应:', responseData);
                                
                                // 处理生成中的状态
                                if (responseData && responseData.status === 'running' && responseData.results === null) {
                                    throw new Error(`当前平台 ${provider} 图片生成失败: 生成任务仍在运行中，请稍后重试`);
                                }
                            }
                        } catch (e) {
                            // 如果仍然失败，尝试使用正则表达式提取所有JSON对象
                            const jsonRegex = /\{[\s\S]*?\}/g;
                            const matches = jsonStr.match(jsonRegex);
                            if (matches && matches.length > 0) {
                                // 使用第一个匹配的JSON对象
                                responseData = JSON.parse(matches[0]);
                                console.log('通过正则提取的JSON:', responseData);
                                
                                // 处理生成中的状态
                                if (responseData && responseData.status === 'running' && responseData.results === null) {
                                    throw new Error(`当前平台 ${provider} 图片生成失败: 生成任务仍在运行中，请稍后重试`);
                                }
                            } else {
                                // 如果没有匹配到，抛出错误
                                throw e;
                            }
                        }
                    }
                } else {
                    // 尝试解析为正常JSON
                    try {
                        responseData = JSON.parse(textResponse);
                        console.log('直接解析JSON响应:', responseData);
                        
                        // 处理生成中的状态
                        if (responseData && responseData.status === 'running' && responseData.results === null) {
                            throw new Error(`当前平台 ${provider} 图片生成失败: 生成任务仍在运行中，请稍后重试`);
                        }
                    } catch (e) {
                        // 处理可能的多个JSON对象
                        const jsonRegex = /\{[\s\S]*?\}/g;
                        const matches = textResponse.match(jsonRegex);
                        if (matches && matches.length > 0) {
                            // 使用第一个匹配的JSON对象
                            responseData = JSON.parse(matches[0]);
                            console.log('通过正则提取的JSON:', responseData);
                            
                            // 处理生成中的状态
                            if (responseData && responseData.status === 'running' && responseData.results === null) {
                                throw new Error(`当前平台 ${provider} 图片生成失败: 生成任务仍在运行中，请稍后重试`);
                            }
                        } else {
                            // 处理可能的数组响应
                            const arrayRegex = /\[[\s\S]*?\]/g;
                            const arrayMatches = textResponse.match(arrayRegex);
                            if (arrayMatches && arrayMatches.length > 0) {
                                responseData = JSON.parse(arrayMatches[0]);
                                console.log('通过正则提取的数组:', responseData);
                            } else {
                                // 如果没有匹配到，抛出错误
                                throw e;
                            }
                        }
                    }
                }
            }
        }
    } catch (jsonError) {
            // 如果JSON解析失败，提供更友好的错误信息
            console.error('JSON解析错误:', jsonError);
            console.error('原始响应文本:', textResponse);
            
            // 尝试作为最后的手段，直接检查文本响应中是否包含URL
            if (textResponse) {
                // 检查是否直接包含图像URL
                if (textResponse.startsWith('http') || textResponse.startsWith('data:image')) {
                    console.log('直接返回文本响应作为URL:', textResponse);
                    return textResponse;
                }
                
                // 尝试从文本中提取URL
                const urlRegex = /https?:\/\/[^\s"'\}]+/g;
                const matches = textResponse.match(urlRegex);
                if (matches && matches.length > 0) {
                    for (const match of matches) {
                        const cleanMatch = match.replace(/[\",'}\]]*$/, '');
                        if (cleanMatch.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico)$/i)) {
                            console.log('从错误响应中提取到图像URL:', cleanMatch);
                            return cleanMatch;
                        }
                    }
                    // 返回第一个URL作为最后的尝试
                    const cleanMatch = matches[0].replace(/[\",'}\]]*$/, '');
                    console.log('从错误响应中提取到第一个URL:', cleanMatch);
                    return cleanMatch;
                }
            }
            
            // 如果所有尝试都失败，抛出错误
            throw new Error(`当前平台 ${provider} 图片生成失败: 服务器返回数据格式异常，请尝试选择其他平台`);
        }
    
    // 使用解析后的数据
    data = responseData;
    
    // 处理不同平台的响应格式 - 优先处理Gemini平台
    console.log('当前平台:', provider, '响应数据类型:', typeof data, '响应数据:', data);
    
    // 1. 检查是否直接是URL
    if (typeof data === 'string') {
        if (data.startsWith('http') || data.startsWith('data:image')) {
            console.log('直接返回字符串URL:', data);
            return data;
        }
        // 如果是纯文本，尝试解析为JSON
        try {
            const parsed = JSON.parse(data);
            console.log('解析纯文本为JSON:', parsed);
            data = parsed;
        } catch (e) {
            console.log('无法解析为JSON，直接返回文本:', data);
            return data;
        }
    }
    
    // 2. 检查是否为对象或数组，添加更多可能的图像数据位置
    if (typeof data === 'object' && data !== null) {
        // 检查所有可能的图像数据位置，包括深层嵌套
        const findImageData = (obj: any, path: string = ''): string | null => {
            if (!obj) return null;
            
            // 检查当前对象是否包含图像数据
            if (typeof obj === 'string') {
                if (obj.startsWith('http') || obj.startsWith('data:image')) {
                    console.log('找到图像数据:', obj, '路径:', path);
                    return obj;
                }
                return null;
            }
            
            // 处理数组情况
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                    const result = findImageData(obj[i], `${path}[${i}]`);
                    if (result) {
                        return result;
                    }
                }
                return null;
            }
            
            // 处理对象情况
            if (typeof obj === 'object') {
                // 检查常见的图像字段（添加更多可能的字段名）
                const imageFields = ['url', 'image', 'image_url', 'img_url', 'picture', 'photo', 'b64_json', 'base64', 'data', 'result', 'response'];
                
                for (const field of imageFields) {
                    if (obj[field] && typeof obj[field] === 'string') {
                        if (obj[field].startsWith('http') || obj[field].startsWith('data:image')) {
                            console.log(`找到${field}字段: ${obj[field]}, 路径: ${path}.${field}`);
                            return obj[field];
                        }
                    } else if (obj[field] && typeof obj[field] === 'object') {
                        // 如果字段是对象，递归检查
                        const nestedResult = findImageData(obj[field], path + '.' + field);
                        if (nestedResult) {
                            return nestedResult;
                        }
                    }
                }
                
                // 递归检查所有属性
                for (const key in obj) {
                    if (Object.prototype.hasOwnProperty.call(obj, key)) {
                        const result = findImageData(obj[key], path ? `${path}.${key}` : key);
                        if (result) {
                            return result;
                        }
                    }
                }
            }
            return null;
        };
        
        // 处理API响应的状态
        if (data.status) {
            console.log('API响应状态:', data.status);
            
            // 检查是否为失败状态
            if (data.status === 'failed' || data.status === 'error') {
                const errorMsg = data.failure_reason || data.error || '生成失败';
                throw new Error(`当前平台 ${provider} 图片生成失败: ${errorMsg}`);
            }
            
            // 检查是否为成功状态
            if (data.status === 'succeeded') {
                console.log('API响应成功，检查results字段');
                
                // 处理results字段
                if (data.results) {
                    if (Array.isArray(data.results)) {
                        console.log('results是数组，长度:', data.results.length);
                        // 如果results是数组，检查第一个元素
                        if (data.results.length > 0) {
                            const firstResult = data.results[0];
                            const imageUrl = firstResult.url || firstResult.image || firstResult.image_url;
                            if (imageUrl) {
                                console.log('从results数组中提取到图像URL:', imageUrl);
                                return imageUrl;
                            }
                            // 递归检查第一个结果
                            const result = findImageData(firstResult, 'results[0]');
                            if (result) {
                                return result;
                            }
                        }
                    } else if (typeof data.results === 'object') {
                        // 如果results是对象，直接检查
                        const result = findImageData(data.results, 'results');
                        if (result) {
                            return result;
                        }
                    } else if (typeof data.results === 'string') {
                        // 如果results是字符串，直接检查
                        if (data.results.startsWith('http') || data.results.startsWith('data:image')) {
                            return data.results;
                        }
                    }
                } else if (data.result) {
                    // 检查result字段
                    const result = findImageData(data.result, 'result');
                    if (result) {
                        return result;
                    }
                }
            }
        }
        
        // 特别处理Gemini平台的nano-banana-pro模型响应
        if (currentApiConfig.provider === 'gemini' && (currentModel === 'nano-banana-pro' || currentModel === 'nano-banana')) {
            console.log('特别处理nano-banana模型响应');
            
            // 检查常见的nano-banana响应结构
            if (data.data && data.data.image) {
                console.log('nano-banana响应包含data.image:', data.data.image);
                return data.data.image;
            }
            if (data.result && data.result.image) {
                console.log('nano-banana响应包含result.image:', data.result.image);
                return data.result.image;
            }
            if (data.image) {
                console.log('nano-banana响应直接包含image:', data.image);
                return data.image;
            }
            if (data.url) {
                console.log('nano-banana响应直接包含url:', data.url);
                return data.url;
            }
        }
        
        // 首先检查根对象/数组
        console.log('检查根对象/数组:', data);
        const rootResult = findImageData(data, 'root');
        if (rootResult) {
            return rootResult;
        }
        
        // 检查常见的API响应结构
        const commonResponseKeys = ['data', 'result', 'response', 'output', 'results', 'images', 'content', 'body', 'payload', 'value', 'generatedContent'];
        
        for (const key of commonResponseKeys) {
            if (data[key]) {
                console.log(`检查${key}属性:`, data[key]);
                const result = findImageData(data[key], key);
                if (result) {
                    return result;
                }
            }
        }
        
        // 检查是否有success状态和data组合
        if (data.success && data.data) {
            console.log('检查success.data属性:', data.data);
            const successResult = findImageData(data.data, 'success.data');
            if (successResult) {
                return successResult;
            }
        }
        
        // 检查是否有data.success和data.data组合
        if (data.data && data.data.success && data.data.data) {
            console.log('检查data.success.data属性:', data.data.data);
            const result = findImageData(data.data.data, 'data.data');
            if (result) {
                return result;
            }
        }
        
        // 检查嵌套多层的响应结构
        if (data.data && typeof data.data === 'object') {
            const nestedKeys = Object.keys(data.data);
            for (const nestedKey of nestedKeys) {
                if (typeof data.data[nestedKey] === 'object' || Array.isArray(data.data[nestedKey])) {
                    const result = findImageData(data.data[nestedKey], `data.${nestedKey}`);
                    if (result) {
                        return result;
                    }
                }
            }
        }
        
        // 特别处理所有平台的图像数组
        const imageArrays = ['images', 'results', 'output', 'items', 'list', 'generatedImages', 'imageResults', 'pictures', 'photos'];
        for (const arrayKey of imageArrays) {
            if (data[arrayKey] && Array.isArray(data[arrayKey])) {
                console.log(`检查${arrayKey}数组:`, data[arrayKey]);
                for (let i = 0; i < data[arrayKey].length; i++) {
                    const item = data[arrayKey][i];
                    if (item) {
                        // 检查数组项的所有可能图像字段
                        for (const field of ['url', 'image', 'image_url', 'base64', 'b64_json', 'data', 'result', 'response']) {
                            if (item[field]) {
                                if (typeof item[field] === 'string' && (item[field].startsWith('http') || item[field].startsWith('data:image'))) {
                                    return item[field];
                                } else if (typeof item[field] === 'object' || Array.isArray(item[field])) {
                                    const nestedResult = findImageData(item[field], `${arrayKey}[${i}].${field}`);
                                    if (nestedResult) {
                                        return nestedResult;
                                    }
                                } else {
                                    // 其他类型，尝试转换为字符串
                                    const strValue = String(item[field]);
                                    if (strValue.startsWith('http') || strValue.startsWith('data:image')) {
                                        return strValue;
                                    }
                                }
                            }
                        }
                        
                        // 检查整个数组项
                        const itemResult = findImageData(item, `${arrayKey}[${i}]`);
                        if (itemResult) {
                            return itemResult;
                        }
                    }
                }
            }
        }
    }
    
    // 3. 作为最后的尝试，直接返回响应数据的字符串表示
    const stringData = JSON.stringify(data);
    console.log('无法找到图像数据，响应数据:', stringData);
    
    // 更强大的base64图像提取
    if (stringData.includes('data:image')) {
        // 尝试提取base64图像（更宽松的匹配）
        const base64Regex = /data:image\/[^;]+;base64,[a-zA-Z0-9+\/=]+/g;
        const matches = stringData.match(base64Regex);
        if (matches && matches.length > 0) {
            // 清理匹配结果
            const cleanMatch = matches[0].replace(/[\",'}\]]*$/, '');
            console.log('从字符串中提取到base64图像:', cleanMatch);
            return cleanMatch;
        }
    }
    
    // 更强大的URL提取
    if (stringData.includes('http')) {
        // 尝试提取URL（更宽松的匹配）
        const urlRegex = /https?:\/\/[^\s"'\}]+/g;
        const matches = stringData.match(urlRegex);
        if (matches && matches.length > 0) {
            console.log('找到URL匹配:', matches);
            for (const match of matches) {
                // 清理URL
                const cleanMatch = match.replace(/[\",'}\]]*$/, '');
                
                // 检查是否为图像URL
                if (cleanMatch.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp|tiff|ico)$/i) || 
                    cleanMatch.toLowerCase().includes('image') || 
                    cleanMatch.toLowerCase().includes('img') ||
                    cleanMatch.toLowerCase().includes('picture') ||
                    cleanMatch.toLowerCase().includes('photo') ||
                    cleanMatch.toLowerCase().includes('picture') ||
                    // 检查URL路径中是否有图像相关的端点
                    cleanMatch.toLowerCase().includes('/image/') ||
                    cleanMatch.toLowerCase().includes('/generate/') ||
                    cleanMatch.toLowerCase().includes('/generateimage/') ||
                    cleanMatch.toLowerCase().includes('/images/')) {
                    console.log('从字符串中提取到图像URL:', cleanMatch);
                    return cleanMatch;
                }
            }
            
            // 如果没有找到明确的图像URL，返回第一个匹配的URL
            const cleanMatch = matches[0].replace(/[\",'}\]]*$/, '');
            console.log('返回第一个找到的URL:', cleanMatch);
            return cleanMatch;
        }
    }
    
    // 4. 检查是否有其他可能的图像数据格式
    // 检查是否为二进制图像数据
    if (data instanceof ArrayBuffer || data instanceof Blob) {
        console.log('返回Blob/ArrayBuffer图像数据');
        return URL.createObjectURL(new Blob([data]));
    }
    
    // 5. 最终尝试：返回响应文本本身，可能已经是图像URL
    if (textResponse) {
        console.log('返回原始响应文本:', textResponse);
        return textResponse;
    }
    
    throw new Error("No image data returned");
    
};

export const extractCharacters = async (text: string): Promise<Character[]> => {
    // 尝试使用当前平台，失败则切换到下一个平台
    const maxAttempts = 3;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const prompt = `Extract characters from: "${text}". Return JSON array of Character objects with fields: id, name, gender, age, tags, subjectDescription, visualPrompt.`;
            const response = await fetch(getEndpoint('/v1/chat/completions'), {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    model: currentApiConfig.textModel,
                    messages: [{ role: "user", content: prompt }]
                })
            });
    
            if (!response.ok) {
                const err = await response.text();
                // 记录当前平台为不可用
                platformAvailability[currentApiConfig.provider] = false;
                throw new Error(`当前平台 ${currentApiConfig.provider} 调用失败: ${err}，请尝试选择其他平台`);
            }
            
            // 记录当前平台为可用
            platformAvailability[currentApiConfig.provider] = true;
            
            const data = await response.json();
            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/); 
            return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        } catch (error: any) {
            attempts++;
            if (attempts < maxAttempts) {
                // 切换到下一个平台
                console.log(`切换到下一个平台，当前尝试次数：${attempts}`);
                switchToNextPlatform();
            } else {
                // 所有平台都尝试失败，抛出最终错误
                throw new Error(`所有平台调用失败：${error.message}`);
            }
        }
    }
    
    throw new Error("未知错误");
};

export const generateComicScript = async (prompt: string, style: string): Promise<ComicData> => {
    // 尝试使用当前平台，失败则切换到下一个平台
    const maxAttempts = 3;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const p = `Create a comic script about "${prompt}" in style "${style}". Return JSON: { "title": "", "style": "", "panels": [ { "id": 1, "panelNumber": 1, "description": "", "visualPrompt": "", "caption": "" } ] }`;
            const response = await fetch(getEndpoint('/v1/chat/completions'), {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    model: currentApiConfig.textModel,
                    messages: [{ role: "user", content: p }]
                })
            });
    
            if (!response.ok) {
                const err = await response.text();
                // 记录当前平台为不可用
                platformAvailability[currentApiConfig.provider] = false;
                throw new Error(`当前平台 ${currentApiConfig.provider} 调用失败: ${err}，请尝试选择其他平台`);
            }
            
            // 记录当前平台为可用
            platformAvailability[currentApiConfig.provider] = true;
            
            const data = await response.json();
            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : { title: "Error", style: style, panels: [] };
        } catch (error: any) {
            attempts++;
            if (attempts < maxAttempts) {
                // 切换到下一个平台
                console.log(`切换到下一个平台，当前尝试次数：${attempts}`);
                switchToNextPlatform();
            } else {
                // 所有平台都尝试失败，抛出最终错误
                throw new Error(`所有平台调用失败：${error.message}`);
            }
        }
    }
    
    throw new Error("未知错误");
};

export const optimizeImagePrompt = async (prompt: string): Promise<string> => {
    // 尝试使用当前平台，失败则切换到下一个平台
    const maxAttempts = 3;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            const p = `Optimize this image prompt for AI generation (English, detailed, visual): "${prompt}". Return only the prompt string.`;
            const response = await fetch(getEndpoint('/v1/chat/completions'), {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    model: currentApiConfig.textModel,
                    messages: [{ role: "user", content: p }]
                })
            });
    
            if (!response.ok) {
                const err = await response.text();
                // 记录当前平台为不可用
                platformAvailability[currentApiConfig.provider] = false;
                throw new Error(`当前平台 ${currentApiConfig.provider} 调用失败: ${err}，请尝试选择其他平台`);
            }
            
            // 记录当前平台为可用
            platformAvailability[currentApiConfig.provider] = true;
            
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error: any) {
            attempts++;
            if (attempts < maxAttempts) {
                // 切换到下一个平台
                console.log(`切换到下一个平台，当前尝试次数：${attempts}`);
                switchToNextPlatform();
            } else {
                // 所有平台都尝试失败，抛出最终错误
                throw new Error(`所有平台调用失败：${error.message}`);
            }
        }
    }
    
    throw new Error("未知错误");
};

export const generateVideo = async (
    prompt: string, 
    imageUrl: string | undefined, 
    aspectRatio: string = '16:9',
    modelName: string = '', 
    onProgress?: (progress: number, status: string) => void,
    lastFrameUrl?: string,
    duration: number = 5,
    sourceVideoUrl?: string, 
    subjectUrl?: string
): Promise<string> => {
  // 尝试使用当前平台，失败则切换到下一个平台
  const maxPlatformAttempts = 3;
  let platformAttempts = 0;
  
  while (platformAttempts < maxPlatformAttempts) {
    try {
      const { apiKey, videoModel } = currentApiConfig;
      if (!apiKey) throw new Error("API not configured");
      
      // 优先使用用户指定的模型，否则使用配置中的模型
      const modelToUse = modelName || videoModel || 'Sora2-pro';
      const targetRatio = aspectRatio === '9:16' ? '9:16' : '16:9';
      let taskId = '';
      
      let initResponse: Response;
      let initData: any;
      
      // KLING LOGIC (Multimodal)
      if (modelToUse.includes('kling')) {
          const endpoint = getEndpoint("/v1/video/kling");
          const body: any = {
              model: modelToUse,
              prompt: prompt,
              aspectRatio: targetRatio,
              webHook: "-1",
              shutProgress: false
          };
          // Map inputs
          if (imageUrl) body.imageUrl = imageUrl;
          if (sourceVideoUrl) body.videoUrl = sourceVideoUrl;
          if (subjectUrl) body.subjectUrl = subjectUrl;

          initResponse = await fetch(endpoint, {
              method: 'POST',
              headers: getHeaders(apiKey),
              body: JSON.stringify(body),
              referrerPolicy: 'no-referrer'
          });

          if (!initResponse.ok) {
              const errorText = await initResponse.text();
              throw new Error(`Kling API Error [${initResponse.status}]: ${errorText}`);
          }
          initData = await initResponse.json();
          if (initData.code !== 0 || !initData.data?.id) throw new Error(`Kling Task Failed: ${initData.msg}`);
          taskId = initData.data.id;
      }
      // SORA 2 LOGIC
      else if (modelToUse === 'sora-2') {
          const endpoint = getEndpoint("/v1/video/sora-video");
          const body: any = {
              model: 'sora-2',
              prompt: prompt,
              url: imageUrl, 
              aspectRatio: targetRatio,
              duration: duration,
              webHook: "-1",
              size: "small",
              shutProgress: false
          };
          if (lastFrameUrl) body.lastFrameUrl = lastFrameUrl;

          initResponse = await fetch(endpoint, {
              method: 'POST',
              headers: getHeaders(apiKey),
              body: JSON.stringify(body),
              referrerPolicy: 'no-referrer'
          });

          if (!initResponse.ok) {
              const errorText = await initResponse.text();
              throw new Error(`Sora API Error [${initResponse.status}]: ${errorText}`);
          }
          initData = await initResponse.json();
          if (initData.code !== 0 || !initData.data?.id) throw new Error(`Sora Task Failed: ${initData.msg}`);
          taskId = initData.data.id;
      }
      // VEO 3 LOGIC
      else {
          const endpoint = getEndpoint("/v1/video/veo");
          const body: any = {
              model: modelToUse,
              prompt: prompt,
              aspectRatio: targetRatio,
              webHook: "-1",
              shutProgress: false
          };
          if (imageUrl) body.firstFrameUrl = imageUrl; 
          if (lastFrameUrl) body.lastFrameUrl = lastFrameUrl;

          initResponse = await fetch(endpoint, {
              method: 'POST',
              headers: getHeaders(apiKey),
              body: JSON.stringify(body),
              referrerPolicy: 'no-referrer'
          });

          if (!initResponse.ok) {
              const errorText = await initResponse.text();
              throw new Error(`Veo API Error [${initResponse.status}]: ${errorText}`);
          }
          initData = await initResponse.json();
          if (initData.code !== 0 || !initData.data?.id) throw new Error(`Veo Task Failed: ${initData.msg}`);
          taskId = initData.data.id;
      }

      if (onProgress) onProgress(0, 'queued');

      const maxPollAttempts = 360; 
      let pollAttempts = 0;
      const resultUrl = getEndpoint("/v1/draw/result");

      // POLLING LOOP
      while (pollAttempts < maxPollAttempts) {
          await new Promise(resolve => setTimeout(resolve, 5000)); 
          pollAttempts++;

          try {
              const resultResponse = await fetch(resultUrl, {
                  method: 'POST',
                  headers: getHeaders(apiKey),
                  body: JSON.stringify({ id: taskId }),
                  referrerPolicy: 'no-referrer'
              });

              if (!resultResponse.ok) continue;

              const resultData = await resultResponse.json();
              
              if (resultData.code === 0 && resultData.data) {
                  const { status, url, failure_reason, error, progress, results } = resultData.data;
                  
                  if (onProgress) onProgress(progress || 0, status || 'running');

                  if (status === 'succeeded') {
                      if (results && results.length > 0 && results[0].url) return results[0].url;
                      else if (url) return url;
                  } else if (status === 'failed') {
                      throw new Error(`Video Generation Failed: ${failure_reason || error}`);
                  }
              }
          } catch (pollError: any) {
               if (pollError.message.includes('Video Generation Failed')) throw pollError;
               console.warn("[Polling] Exception (retrying):", pollError);
          }
      }

      throw new Error("Video generation timed out.");

    } catch (error: any) {
      platformAttempts++;
      if (platformAttempts < maxPlatformAttempts) {
          // 记录当前平台为不可用
          platformAvailability[currentApiConfig.provider] = false;
          // 切换到下一个平台
          console.log(`切换到下一个平台，当前尝试次数：${platformAttempts}`);
          switchToNextPlatform();
      } else {
          // 所有平台都尝试失败，抛出最终错误
          console.error("Video Gen Error:", error);
          throw new Error(`所有平台调用失败：${error.message}`);
      }
    }
  }
  
  // 理论上不会到达这里
  throw new Error("未知错误");
};
