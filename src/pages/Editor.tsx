import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Save, 
  Download, 
  Undo, 
  Redo, 
  Type, 
  Image, 
  Square, 
  Circle,
  ArrowLeft,
  Trash2
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Canvas as FabricCanvas, Textbox, Rect, Circle as FabricCircle, FabricImage, Path, Group } from "fabric";
import { supabase } from "@/lib/supabase";

// Add SVG parsing utility
const parseSVG = async (svgUrl: string): Promise<SVGElement> => {
  try {
    console.log('Starting SVG parse for URL:', svgUrl);
    
    // If it's a Supabase URL, get a signed URL
    if (svgUrl.includes('supabase')) {
      console.log('Getting signed URL for Supabase storage...');
      const { data: signedUrl, error: signedUrlError } = await supabase.storage
        .from('template-thumbnails')
        .createSignedUrl(svgUrl.split('/').pop() || '', 60);
      
      if (signedUrlError) {
        console.error('Error getting signed URL:', signedUrlError);
        throw signedUrlError;
      }
      
      if (signedUrl?.signedUrl) {
        svgUrl = signedUrl.signedUrl;
        console.log('Got signed URL:', svgUrl);
      } else {
        console.error('No signed URL received');
        throw new Error('Failed to get signed URL');
      }
    }

    console.log('Fetching SVG content...');
    const response = await fetch(svgUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch SVG: ${response.statusText}`);
    }

    const svgText = await response.text();
    console.log('SVG content received:', svgText.substring(0, 200) + '...');

    // Parse the SVG
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    
    if (svgDoc.documentElement.tagName.toLowerCase() !== 'svg') {
      console.error('Invalid SVG document:', svgDoc.documentElement.tagName);
      throw new Error('Invalid SVG document');
    }

    // Get SVG dimensions
    const svgElement = svgDoc.documentElement;
    const width = svgElement.getAttribute('width');
    const height = svgElement.getAttribute('height');
    const viewBox = svgElement.getAttribute('viewBox');

    console.log('SVG dimensions:', { width, height, viewBox });
    console.log('SVG parsed successfully. Elements found:', svgElement.children.length);

    return svgElement;
  } catch (error) {
    console.error('Error parsing SVG:', error);
    throw error;
  }
};

// Convert SVG element to Fabric.js objects
const convertSVGToFabric = (svgElement: SVGElement, canvas: FabricCanvas) => {
  console.log('Starting SVG to Fabric conversion...');
  const objects: any[] = [];

  // Get SVG dimensions
  const svgWidth = parseFloat(svgElement.getAttribute('width') || '0');
  const svgHeight = parseFloat(svgElement.getAttribute('height') || '0');
  const viewBox = svgElement.getAttribute('viewBox');
  
  console.log('SVG dimensions:', {
    width: svgWidth,
    height: svgHeight,
    viewBox
  });

  // Calculate scale to fit canvas
  let scale = 1;
  if (viewBox) {
    const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
    if (vbWidth && vbHeight) {
      const scaleX = canvas.width / vbWidth;
      const scaleY = canvas.height / vbHeight;
      scale = Math.min(scaleX, scaleY) * 0.8; // 80% of the canvas size
      console.log('Calculated scale from viewBox:', scale);
    }
  } else if (svgWidth && svgHeight) {
    const scaleX = canvas.width / svgWidth;
    const scaleY = canvas.height / svgHeight;
    scale = Math.min(scaleX, scaleY) * 0.8; // 80% of the canvas size
    console.log('Calculated scale from dimensions:', scale);
  }

  // Helper function to get computed style
  const getComputedStyle = (element: Element) => {
    const style = window.getComputedStyle(element);
    const fill = element.getAttribute('fill') || style.fill;
    const stroke = element.getAttribute('stroke') || style.stroke;
    const strokeWidth = element.getAttribute('stroke-width') || style.strokeWidth;
    const opacity = element.getAttribute('opacity') || style.opacity;
    const fillOpacity = element.getAttribute('fill-opacity') || style.fillOpacity;

    // Parse style attribute if present
    const styleAttr = element.getAttribute('style');
    let parsedStyle = {};
    if (styleAttr) {
      parsedStyle = styleAttr.split(';').reduce((acc, style) => {
        const [key, value] = style.split(':').map(s => s.trim());
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {});
    }

    console.log('Element style:', {
      tagName: element.tagName,
      fill,
      stroke,
      strokeWidth,
      opacity,
      fillOpacity,
      styleAttr,
      parsedStyle
    });

    return {
      fill: parsedStyle['fill'] || fill !== 'none' ? fill : 'transparent',
      stroke: parsedStyle['stroke'] || stroke !== 'none' ? stroke : 'transparent',
      strokeWidth: parseFloat(parsedStyle['stroke-width'] || strokeWidth) || 0,
      opacity: parseFloat(parsedStyle['opacity'] || opacity) || 1,
      fillOpacity: parseFloat(parsedStyle['fill-opacity'] || fillOpacity) || 1,
      transform: element.getAttribute('transform') || '',
    };
  };

  // Helper function to parse transform attribute
  const parseTransform = (transform: string) => {
    const matrix = {
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0
    };

    if (!transform) return matrix;

    const transforms = transform.split(')');
    transforms.forEach(t => {
      if (t.includes('translate')) {
        const [x, y] = t.match(/translate\(([^)]+)\)/)?.[1].split(/[\s,]+/).map(Number) || [0, 0];
        matrix.e += x;
        matrix.f += y;
      } else if (t.includes('scale')) {
        const [x, y] = t.match(/scale\(([^)]+)\)/)?.[1].split(/[\s,]+/).map(Number) || [1, 1];
        matrix.a *= x;
        matrix.d *= y;
      } else if (t.includes('rotate')) {
        const [angle, cx, cy] = t.match(/rotate\(([^)]+)\)/)?.[1].split(/[\s,]+/).map(Number) || [0, 0, 0];
        const rad = (angle * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        matrix.a = cos;
        matrix.b = sin;
        matrix.c = -sin;
        matrix.d = cos;
        if (cx || cy) {
          matrix.e = cx - (cx * cos - cy * sin);
          matrix.f = cy - (cx * sin + cy * cos);
        }
      }
    });

    return matrix;
  };

  // Helper function to apply common properties
  const applyCommonProperties = (obj: any, element: Element) => {
    const style = getComputedStyle(element);
    const transform = parseTransform(style.transform);

    obj.set({
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity,
      fillOpacity: style.fillOpacity,
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockUniScaling: false,
      hasRotatingPoint: true,
      cornerColor: '#3B82F6',
      cornerSize: 10,
      transparentCorners: false,
      borderColor: '#3B82F6',
      borderScaleFactor: 2
    });

    // Apply transform
    if (transform) {
      obj.set({
        scaleX: transform.a * scale,
        scaleY: transform.d * scale,
        angle: Math.atan2(transform.b, transform.a) * (180 / Math.PI),
        left: transform.e * scale,
        top: transform.f * scale
      });
    } else {
      // Apply base scale if no transform
      obj.set({
        scaleX: scale,
        scaleY: scale
      });
    }
  };

  // Helper function to convert SVG path to Fabric.js path
  const createPath = (pathElement: SVGPathElement) => {
    const pathData = pathElement.getAttribute('d');
    if (!pathData) return null;

    const style = getComputedStyle(pathElement);
    const path = new Path(pathData, {
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity,
      fillOpacity: style.fillOpacity
    });

    applyCommonProperties(path, pathElement);
    return path;
  };

  // Helper function to convert SVG rect to Fabric.js rect
  const createRect = (rectElement: SVGRectElement) => {
    const x = parseFloat(rectElement.getAttribute('x') || '0');
    const y = parseFloat(rectElement.getAttribute('y') || '0');
    const width = parseFloat(rectElement.getAttribute('width') || '0');
    const height = parseFloat(rectElement.getAttribute('height') || '0');
    const rx = parseFloat(rectElement.getAttribute('rx') || '0');
    const ry = parseFloat(rectElement.getAttribute('ry') || '0');

    const style = getComputedStyle(rectElement);
    const rect = new Rect({
      left: x,
      top: y,
      width,
      height,
      rx: rx || 0,
      ry: ry || 0,
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity,
      fillOpacity: style.fillOpacity
    });

    applyCommonProperties(rect, rectElement);
    return rect;
  };

  // Helper function to convert SVG circle to Fabric.js circle
  const createCircle = (circleElement: SVGCircleElement) => {
    const cx = parseFloat(circleElement.getAttribute('cx') || '0');
    const cy = parseFloat(circleElement.getAttribute('cy') || '0');
    const r = parseFloat(circleElement.getAttribute('r') || '0');

    const style = getComputedStyle(circleElement);
    const circle = new FabricCircle({
      left: cx - r,
      top: cy - r,
      radius: r,
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity,
      fillOpacity: style.fillOpacity
    });

    applyCommonProperties(circle, circleElement);
    return circle;
  };

  // Helper function to convert SVG text to Fabric.js text
  const createText = (textElement: SVGTextElement) => {
    const x = parseFloat(textElement.getAttribute('x') || '0');
    const y = parseFloat(textElement.getAttribute('y') || '0');
    const text = textElement.textContent || '';
    const fontSize = parseFloat(textElement.getAttribute('font-size') || '16');
    const fontFamily = textElement.getAttribute('font-family') || 'Arial';
    const textAnchor = textElement.getAttribute('text-anchor') || 'start';

    const style = getComputedStyle(textElement);
    const fabricText = new Textbox(text, {
      left: x,
      top: y,
      fontSize,
      fontFamily,
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      opacity: style.opacity,
      fillOpacity: style.fillOpacity,
      textAlign: textAnchor === 'middle' ? 'center' : textAnchor === 'end' ? 'right' : 'left',
      editable: true
    });

    applyCommonProperties(fabricText, textElement);
    return fabricText;
  };

  // Process SVG elements
  const processElement = (element: Element) => {
    console.log('Processing element:', element.tagName, {
      id: element.id,
      className: element.className,
      attributes: Array.from(element.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', ')
    });
    
    // Skip hidden elements
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      console.log('Skipping hidden element:', element.tagName);
      return;
    }

    // Process children first for defs and groups
    if (element.tagName.toLowerCase() === 'defs' || element.tagName.toLowerCase() === 'g') {
      console.log(`Processing ${element.tagName} children...`);
      Array.from(element.children).forEach(processElement);
      return;
    }

    switch (element.tagName.toLowerCase()) {
      case 'path':
        console.log('Converting path element');
        const path = createPath(element as SVGPathElement);
        if (path) {
          console.log('Path created successfully');
          objects.push(path);
        }
        break;
      case 'rect':
        console.log('Converting rect element');
        const rect = createRect(element as SVGRectElement);
        if (rect) {
          console.log('Rect created successfully');
          objects.push(rect);
        }
        break;
      case 'circle':
        console.log('Converting circle element');
        const circle = createCircle(element as SVGCircleElement);
        if (circle) {
          console.log('Circle created successfully');
          objects.push(circle);
        }
        break;
      case 'text':
        console.log('Converting text element');
        const text = createText(element as SVGTextElement);
        if (text) {
          console.log('Text created successfully');
          objects.push(text);
        }
        break;
      case 'svg':
        // Process SVG children
        console.log('Processing SVG children...');
        Array.from(element.children).forEach(processElement);
        break;
      default:
        console.log('Unhandled element type:', element.tagName);
    }
  };

  // Start processing from the root SVG element
  processElement(svgElement);
  console.log('Total objects created:', objects.length);

  // If we have objects, create a group
  if (objects.length > 0) {
    console.log('Creating group from objects...');
    const group = new Group(objects, {
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      lockMovementX: false,
      lockMovementY: false,
      lockRotation: false,
      lockScalingX: false,
      lockScalingY: false,
      lockUniScaling: false,
      hasRotatingPoint: true,
      cornerColor: '#3B82F6',
      cornerSize: 10,
      transparentCorners: false,
      borderColor: '#3B82F6',
      borderScaleFactor: 2
    });

    // Apply scale to the group
    group.scale(scale);
    
    // Center the group on the canvas
    group.set({
      left: (canvas.width - group.width * scale) / 2,
      top: (canvas.height - group.height * scale) / 2
    });

    return [group];
  }

  return objects;
};

const Editor = () => {
  const { templateId } = useParams();
  console.log("Editor loaded with templateId:", templateId);
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canvasInitialized = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || canvasInitialized.current) {
      console.log('useEffect: Canvas already initialized or ref not ready');
      return;
    }

    // Add direct DOM click event for debugging
    if (canvasRef.current) {
      canvasRef.current.addEventListener('click', () => {
        console.log('Canvas DOM element clicked');
      });
    }

    let disposed = false;
    const initializeFabric = async () => {
      try {
        console.log('initializeFabric: Creating FabricCanvas...');
        
        if (!canvasRef.current) {
          throw new Error('Canvas element not found');
        }

        // Set canvas dimensions based on container
        const container = canvasRef.current.parentElement;
        const containerWidth = container?.clientWidth || 800;
        const containerHeight = container?.clientHeight || 1000;

        console.log('Container dimensions:', containerWidth, 'x', containerHeight);

        const canvas = new FabricCanvas(canvasRef.current, {
          width: containerWidth,
          height: containerHeight,
          backgroundColor: 'white',
          selection: false // Disable default selection
        });

        // Track mouse state
        let isDragging = false;
        let lastPosX = 0;
        let lastPosY = 0;

        // Mouse down handler
        canvas.on('mouse:down', (e) => {
          const pointer = canvas.getPointer(e.e);
          const target = canvas.findTarget(e.e);
          
          if (target) {
            isDragging = true;
            lastPosX = pointer.x;
            lastPosY = pointer.y;
            canvas.setActiveObject(target);
            canvas.renderAll();
          }
        });

        // Mouse move handler
        canvas.on('mouse:move', (e) => {
          if (!isDragging) return;

          const pointer = canvas.getPointer(e.e);
          const activeObject = canvas.getActiveObject();

          if (activeObject) {
            const deltaX = pointer.x - lastPosX;
            const deltaY = pointer.y - lastPosY;

            activeObject.set({
              left: activeObject.left + deltaX,
              top: activeObject.top + deltaY
            });

            lastPosX = pointer.x;
            lastPosY = pointer.y;

            canvas.renderAll();
          }
        });

        // Mouse up handler
        canvas.on('mouse:up', () => {
          isDragging = false;
        });

        // Set up object defaults
        canvas.on('object:added', (e) => {
          const obj = e.target;
          if (obj) {
            obj.set({
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
              lockMovementX: false,
              lockMovementY: false,
              lockRotation: false,
              lockScalingX: false,
              lockScalingY: false,
              lockUniScaling: false,
              hasRotatingPoint: true,
              cornerColor: '#3B82F6',
              cornerSize: 10,
              transparentCorners: false,
              borderColor: '#3B82F6',
              borderScaleFactor: 2
            });

            canvas.renderAll();
          }
        });

        // Initialize the canvas
        canvasInitialized.current = true;
        setFabricCanvas(canvas);

        // Load template
        await loadTemplate(canvas, templateId);

        if (!disposed) {
          setIsLoading(false);
        }

        toast({
          title: "Editor Ready",
          description: "You can now start editing your template.",
        });
      } catch (error) {
        console.error('Failed to initialize Fabric.js:', error);
        if (!disposed) {
          setIsLoading(false);
        }
      }
    };

    initializeFabric();

    return () => {
      disposed = true;
      if (fabricCanvas) {
        fabricCanvas.dispose();
        canvasInitialized.current = false;
        setFabricCanvas(null);
      }
    };
  }, [templateId]);

  const loadTemplate = async (canvas: FabricCanvas, id: string | undefined) => {
    console.log("loadTemplate called with id:", id);
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('content, thumbnail')
        .eq('id', id)
        .single();
      
      console.log('loadTemplate: Supabase fetch result:', { data, error });
      if (error) throw error;

      if (data) {
        if (data.content) {
          // Load existing canvas content
          console.log('loadTemplate: Loading canvas from JSON...');
          await new Promise<void>((resolve) => {
            canvas.loadFromJSON(data.content, () => {
              canvas.getObjects().forEach(obj => {
                obj.set({
                  selectable: true,
                  evented: true,
                  crossOrigin: 'anonymous'
                });
              });
              canvas.renderAll();
              resolve();
            });
          });
        } else if (data.thumbnail && data.thumbnail.endsWith('.svg')) {
          // Convert SVG thumbnail to editable components
          console.log('loadTemplate: Converting SVG thumbnail to editable components...');
          try {
            console.log('Starting SVG conversion process...');
            const svgElement = await parseSVG(data.thumbnail);
            console.log('SVG parsed successfully:', svgElement);
            
            const fabricObjects = convertSVGToFabric(svgElement, canvas);
            console.log('Fabric objects created:', fabricObjects.length);
            
            if (fabricObjects.length === 0) {
              console.warn('No objects were created from the SVG');
              toast({
                title: "Warning",
                description: "No editable elements found in the SVG.",
                variant: "destructive"
              });
              return;
            }
            
            // Add all objects to canvas
            fabricObjects.forEach((obj, index) => {
              console.log(`Adding object ${index + 1} to canvas:`, obj.type);
              canvas.add(obj);
            });
            
            // Group all objects if there are multiple
            if (fabricObjects.length > 1) {
              console.log('Grouping multiple objects...');
              const group = new Group(fabricObjects, {
                selectable: true,
                evented: true,
                hasControls: true,
                hasBorders: true,
                lockMovementX: false,
                lockMovementY: false,
                lockRotation: false,
                lockScalingX: false,
                lockScalingY: false,
                lockUniScaling: false,
                hasRotatingPoint: true,
                cornerColor: '#3B82F6',
                cornerSize: 10,
                transparentCorners: false,
                borderColor: '#3B82F6',
                borderScaleFactor: 2
              });
              
              canvas.remove(...fabricObjects);
              canvas.add(group);
              console.log('Objects grouped successfully');
            }
            
            canvas.renderAll();
            console.log('loadTemplate: SVG converted and added to canvas');
          } catch (error) {
            console.error('Error converting SVG:', error);
            toast({
              title: "SVG Conversion Error",
              description: `Failed to convert SVG: ${error.message}`,
              variant: "destructive"
            });
          }
        }
      } else {
        console.log('loadTemplate: No content found for template, loading default empty canvas');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: "Template Error",
        description: `Failed to load template: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const addText = () => {
    try {
      if (!fabricCanvas) return;

      const text = new Textbox('Click to edit text', {
        left: 100,
        top: 100,
        fontSize: 16,
        fill: '#000',
        width: 200,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockMovementX: false,
        lockMovementY: false,
        lockRotation: false,
        lockScalingX: false,
        lockScalingY: false,
        lockUniScaling: false,
        hasRotatingPoint: true,
        editable: true,
        padding: 5,
        cornerColor: '#3B82F6',
        cornerSize: 10,
        transparentCorners: false,
        borderColor: '#3B82F6',
        borderScaleFactor: 2
      });

      // Add double-click handler for text editing
      text.on('mousedblclick', () => {
        text.enterEditing();
        text.selectAll();
        fabricCanvas.renderAll();
      });

      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      fabricCanvas.renderAll();

      toast({
        title: "Text Added",
        description: "Double click on the text to edit it.",
      });
    } catch (error) {
      console.error('Error adding text:', error);
      toast({
        title: "Error",
        description: "Failed to add text element.",
        variant: "destructive"
      });
    }
  };

  const addShape = (shapeType: 'rectangle' | 'circle') => {
    try {
      if (!fabricCanvas) return;

      let shape;
      if (shapeType === 'rectangle') {
        shape = new Rect({
          left: 150,
          top: 150,
          width: 100,
          height: 100,
          fill: '#3B82F6',
          stroke: '#1E40AF',
          strokeWidth: 2,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          lockMovementX: false,
          lockMovementY: false,
          lockRotation: false,
          lockScalingX: false,
          lockScalingY: false,
          lockUniScaling: false,
          hasRotatingPoint: true,
          cornerColor: '#3B82F6',
          cornerSize: 10,
          transparentCorners: false,
          borderColor: '#3B82F6',
          borderScaleFactor: 2
        });
      } else {
        shape = new FabricCircle({
          left: 150,
          top: 150,
          radius: 50,
          fill: '#EF4444',
          stroke: '#DC2626',
          strokeWidth: 2,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          lockMovementX: false,
          lockMovementY: false,
          lockRotation: false,
          lockScalingX: false,
          lockScalingY: false,
          lockUniScaling: false,
          hasRotatingPoint: true,
          cornerColor: '#3B82F6',
          cornerSize: 10,
          transparentCorners: false,
          borderColor: '#3B82F6',
          borderScaleFactor: 2
        });
      }

      fabricCanvas.add(shape);
      fabricCanvas.setActiveObject(shape);
      fabricCanvas.renderAll();

      toast({
        title: "Shape Added",
        description: `${shapeType} added to canvas.`,
      });
    } catch (error) {
      console.error('Error adding shape:', error);
      toast({
        title: "Error",
        description: "Failed to add shape.",
        variant: "destructive"
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }
    if (!fabricCanvas) {
      console.error('Canvas not initialized');
      toast({
        title: "Error",
        description: "Canvas not ready. Please try again.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('templates')
        .upload(fileName, file);

      if (error) throw error;

      // Get signed URL
      const { data: signedUrl } = await supabase.storage
        .from('templates')
        .createSignedUrl(fileName, 60);

      if (!signedUrl?.signedUrl) {
        throw new Error('Failed to get signed URL');
      }

      // Load image with CORS
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = signedUrl.signedUrl;
      });

      const fabricImage = new FabricImage(img, {
        left: 100,
        top: 200,
        selectable: true,
        evented: true,
        crossOrigin: 'anonymous'
      });

      // Scale image to fit nicely on canvas
      const maxWidth = 300;
      if (fabricImage.width && fabricImage.width > maxWidth) {
        fabricImage.scaleToWidth(maxWidth);
      }

      fabricCanvas.add(fabricImage);
      fabricCanvas.setActiveObject(fabricImage);
      fabricCanvas.renderAll();

      console.log('Image added to canvas successfully');
      toast({
        title: "Image Added",
        description: "Image uploaded successfully.",
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    }

    event.target.value = '';
  };

  const deleteSelected = () => {
    try {
      console.log('Attempting to delete selected object');
      if (!fabricCanvas) {
        console.error('Canvas not initialized');
        return;
      }
      
      const activeObject = fabricCanvas.getActiveObject();
      if (!activeObject) {
        console.log('No object selected to delete');
        toast({
          title: "Nothing Selected",
          description: "Please select an object to delete.",
        });
        return;
      }
      
      fabricCanvas.remove(activeObject);
      fabricCanvas.renderAll();
      setSelectedObject(null);
      console.log('Object deleted successfully');
      
      toast({
        title: "Object Deleted",
        description: "Selected object has been removed.",
      });
    } catch (error) {
      console.error('Error deleting object:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete object.",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!fabricCanvas || !templateId) {
      toast({
        title: "Error",
        description: "Canvas not ready or template ID missing.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Convert canvas to JSON
      const json = fabricCanvas.toJSON(['selectable', 'evented', 'hasControls', 'hasBorders', 
        'lockMovementX', 'lockMovementY', 'lockRotation', 'lockScalingX', 'lockScalingY', 
        'lockUniScaling', 'hasRotatingPoint', 'cornerColor', 'cornerSize', 'transparentCorners', 
        'borderColor', 'borderScaleFactor', 'editable']);

      // Save to Supabase
      const { error } = await supabase
        .from('templates')
        .update({ 
          content: json,
          last_modified: new Date().toISOString()
        })
        .eq('id', templateId);

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      toast({
        title: "Saved!",
        description: "Your template has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Save Error",
        description: "Failed to save template. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async () => {
    try {
      console.log('handleDownload: Attempting to download canvas');
      if (!fabricCanvas) {
        console.error('Canvas not initialized');
        toast({
          title: "Error",
          description: "Canvas not ready for download.",
          variant: "destructive"
        });
        return;
      }

      // Create a temporary canvas element
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = fabricCanvas.width || 800;
      tempCanvas.height = fabricCanvas.height || 1000;
      const ctx = tempCanvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Draw white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      // Get the lower canvas element
      const lowerCanvas = fabricCanvas.lowerCanvasEl;
      
      // Draw the lower canvas content
      ctx.drawImage(lowerCanvas, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        tempCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          }
        }, 'image/png', 1.0);
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `design-${Date.now()}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('handleDownload: Download completed successfully');
      toast({
        title: "Download Complete",
        description: "Your design has been downloaded.",
      });
    } catch (error) {
      console.error('Error during download:', error);
      toast({
        title: "Download Error",
        description: "Failed to download design. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-xl font-semibold">Design Editor</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                <Undo className="h-4 w-4 mr-2" />
                Undo
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Redo className="h-4 w-4 mr-2" />
                Redo
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Tools */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Tools</h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={addText}
                >
                  <Type className="h-4 w-4 mr-2" />
                  Add Text
                </Button>
                
                <label className="block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start cursor-pointer"
                    asChild
                  >
                    <span>
                      <Image className="h-4 w-4 mr-2" />
                      Upload Image
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addShape('rectangle')}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Rectangle
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addShape('circle')}
                >
                  <Circle className="h-4 w-4 mr-2" />
                  Circle
                </Button>
              </div>
            </div>

            {/* Properties */}
            {selectedObject && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Properties</h3>
                <Card className="p-3">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Type: {selectedObject.type}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={deleteSelected}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas Area */}
        <main className="flex-1 bg-gray-100 p-8 overflow-auto">
          <div className="flex justify-center">
            <div className="bg-white shadow-lg rounded-lg p-4 relative">
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-gray-600">Loading editor...</p>
                </div>
              )}
              <canvas 
                ref={canvasRef} 
                className="border border-gray-200 max-w-full"
                style={{ display: 'block', visibility: isLoading ? 'hidden' : 'visible' }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Editor;

