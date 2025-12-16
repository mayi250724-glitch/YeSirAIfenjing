import React, { useEffect, useState } from 'react';
import { getActivePageDesignByType } from '../services/authService';

interface DynamicPageDesignProps {
  type: string; // 页面类型：home, about, contact, custom
  onComponentAction?: (action: string, data: any) => void;
}

const DynamicPageDesign: React.FC<DynamicPageDesignProps> = ({ type, onComponentAction }) => {
  const [pageDesign, setPageDesign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPageDesign = async () => {
      try {
        setLoading(true);
        const design = await getActivePageDesignByType(type);
        setPageDesign(design);
        setError(null);
      } catch (err) {
        setError('Failed to load page design');
        console.error('Error fetching page design:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPageDesign();
  }, [type]);

  // 渲染组件
  const renderComponent = (component: any) => {
    const { type, content, style, props } = component;

    switch (type) {
      case 'text':
        return (
          <div style={style} {...props}>
            {typeof content === 'string' ? (
              <p>{content}</p>
            ) : content}
          </div>
        );
      
      case 'image':
        return (
          <img
            src={content?.url || ''}
            alt={content?.alt || 'Image'}
            style={style}
            {...props}
          />
        );
      
      case 'button':
        return (
          <button
            style={style}
            onClick={() => props?.onClick && onComponentAction?.(props.onClick, props?.actionData)}
            {...props}
          >
            {content}
          </button>
        );
      
      case 'card':
        return (
          <div style={style} {...props}>
            {component.components?.map((comp: any) => (
              <div key={comp.id}>{renderComponent(comp)}</div>
            ))}
          </div>
        );
      
      case 'grid':
        return (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${props?.columns || 2}, 1fr)`,
              gap: props?.gap || '16px',
              ...style
            }}
            {...props}
          >
            {component.components?.map((comp: any) => (
              <div key={comp.id}>{renderComponent(comp)}</div>
            ))}
          </div>
        );
      
      case 'section':
        return (
          <section style={style} {...props}>
            {component.components?.map((comp: any) => (
              <div key={comp.id}>{renderComponent(comp)}</div>
            ))}
          </section>
        );
      
      default:
        return (
          <div style={{ ...style, padding: style?.padding || '16px', border: '1px dashed #ccc' }} {...props}>
            <p>未知组件类型: {type}</p>
            <pre style={{ fontSize: '10px', overflow: 'auto' }}>{JSON.stringify(component, null, 2)}</pre>
          </div>
        );
    }
  };

  // 渲染区块
  const renderSection = (section: any) => {
    const { id, type, title, content, style, components } = section;

    return (
      <div
        key={id}
        className={`section section-${type}`}
        style={{
          margin: style?.margin || '24px 0',
          padding: style?.padding || '24px',
          backgroundColor: style?.backgroundColor || 'transparent',
          color: style?.color || 'inherit',
          ...style
        }}
      >
        {title && <h2 style={{ marginBottom: '16px' }}>{title}</h2>}
        {content && <div>{content}</div>}
        {components && components.length > 0 && (
          <div className="section-components">
            {components.map((component: any) => renderComponent(component))}
          </div>
        )}
      </div>
    );
  };

  // 渲染页面
  const renderPage = () => {
    if (!pageDesign || !pageDesign.content) return null;

    const { layout, sections, styles, scripts } = pageDesign.content;

    // 添加全局样式
    if (styles) {
      // 这里可以处理全局样式，例如添加到文档头部
      // 简单实现：通过内联样式应用到容器
    }

    // 渲染布局
    return (
      <div
        className="dynamic-page"
        style={{
          display: layout?.type === 'grid' ? 'grid' : 'block',
          gridTemplateColumns: layout?.columns ? `repeat(${layout.columns}, 1fr)` : '1fr',
          gap: layout?.gap || '20px',
          ...styles?.container
        }}
      >
        {sections && sections.length > 0 ? (
          sections.map(renderSection)
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#666' }}>
            此页面设计没有任何区块
          </div>
        )}

        {/* 添加脚本 */}
        {scripts && scripts.length > 0 && (
          <>
            {scripts.map((script: any, index: number) => {
              if (script.type === 'external' && script.src) {
                return (
                  <script
                    key={index}
                    src={script.src}
                    async={script.async}
                    defer={script.defer}
                  />
                );
              } else if (script.type === 'inline' && script.content) {
                return (
                  <script
                    key={index}
                    dangerouslySetInnerHTML={{ __html: script.content }}
                  />
                );
              }
              return null;
            })}
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px' }}>加载页面设计中...</div>;
  }

  if (error || !pageDesign) {
    return <div style={{ padding: '48px', textAlign: 'center', color: '#ff4444' }}>{error || '页面设计不存在'}</div>;
  }

  return renderPage();
};

export default DynamicPageDesign;