
import { useState, useEffect, useRef } from "react";
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
import { Canvas as FabricCanvas, Textbox, Rect, Circle as FabricCircle, FabricImage } from "fabric";

const Editor = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeFabric = async () => {
      try {
        console.log('Starting Fabric.js initialization...');
        
        if (!canvasRef.current) {
          console.error('Canvas ref is null');
          setIsLoading(false);
          return;
        }

        console.log('Canvas element found, creating FabricCanvas...');
        
        const canvas = new FabricCanvas(canvasRef.current, {
          width: 800,
          height: 1000,
          backgroundColor: 'white'
        });

        console.log('FabricCanvas created successfully:', canvas);
        
        // Initialize the freeDrawingBrush to prevent errors
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = '#000000';
          canvas.freeDrawingBrush.width = 2;
        }
        
        // Load template based on ID
        await loadTemplate(canvas, templateId);
        
        // Handle object selection events
        canvas.on('selection:created', () => {
          console.log('Object selected');
          const activeObject = canvas.getActiveObject();
          setSelectedObject(activeObject);
        });
        
        canvas.on('selection:updated', () => {
          console.log('Selection updated');
          const activeObject = canvas.getActiveObject();
          setSelectedObject(activeObject);
        });
        
        canvas.on('selection:cleared', () => {
          console.log('Selection cleared');
          setSelectedObject(null);
        });

        // Add object modification events for debugging
        canvas.on('object:added', (e) => {
          console.log('Object added:', e.target?.type);
        });

        canvas.on('object:removed', (e) => {
          console.log('Object removed:', e.target?.type);
        });

        setFabricCanvas(canvas);
        setIsLoading(false);
        console.log('Canvas initialization complete and ready for interaction');
        
        toast({
          title: "Editor Ready",
          description: "You can now start editing your template.",
        });
        
      } catch (error) {
        console.error('Failed to initialize Fabric.js:', error);
        toast({
          title: "Error",
          description: "Failed to load the editor. Please refresh and try again.",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    };

    initializeFabric();

    return () => {
      if (fabricCanvas) {
        console.log('Disposing canvas on cleanup');
        fabricCanvas.dispose();
      }
    };
  }, [templateId]);

  const loadTemplate = async (canvas: FabricCanvas, id: string | undefined) => {
    try {
      console.log('Loading template with ID:', id);
      
      // Mock template data - in a real app, this would come from your backend
      const templates: { [key: string]: any } = {
        "1": {
          title: "Modern Resume",
          objects: [
            {
              type: 'textbox',
              text: 'Your Name',
              left: 100,
              top: 50,
              fontSize: 28,
              fontWeight: 'bold'
            },
            {
              type: 'textbox', 
              text: 'Software Developer',
              left: 100,
              top: 90,
              fontSize: 16,
              fill: '#666'
            },
            {
              type: 'textbox',
              text: 'Click to edit this text or add your own content using the tools on the left.',
              left: 100,
              top: 150,
              fontSize: 14,
              fill: '#333',
              width: 600
            }
          ]
        },
        "2": {
          title: "Creative Cover Letter",
          objects: [
            {
              type: 'textbox',
              text: 'Cover Letter',
              left: 100,
              top: 50,
              fontSize: 24,
              fontWeight: 'bold'
            },
            {
              type: 'textbox',
              text: 'Dear Hiring Manager,',
              left: 100,
              top: 100,
              fontSize: 16,
              fill: '#333'
            }
          ]
        }
      };

      const template = templates[id || "1"];
      if (template && template.objects) {
        console.log('Adding template objects:', template.objects.length);
        
        template.objects.forEach((obj: any, index: number) => {
          if (obj.type === 'textbox') {
            const textbox = new Textbox(obj.text, {
              left: obj.left,
              top: obj.top,
              fontSize: obj.fontSize,
              fontWeight: obj.fontWeight,
              fill: obj.fill || '#000',
              width: obj.width || 200
            });
            canvas.add(textbox);
            console.log(`Added textbox ${index + 1}:`, obj.text);
          }
        });
        
        canvas.renderAll();
        console.log('Template loaded successfully with', template.objects.length, 'objects');
      } else {
        console.log('No template found for ID:', id, 'loading default empty canvas');
      }
    } catch (error) {
      console.error('Error loading template:', error);
      toast({
        title: "Template Error",
        description: "Failed to load template, but you can still create your design.",
        variant: "destructive"
      });
    }
  };

  const addText = () => {
    try {
      console.log('Adding new text element');
      if (!fabricCanvas) {
        console.error('Canvas not initialized');
        return;
      }
      
      const text = new Textbox('Click to edit text', {
        left: 100,
        top: 100,
        fontSize: 16,
        fill: '#000',
        width: 200
      });
      
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      fabricCanvas.renderAll();
      console.log('Text element added successfully');
      
      toast({
        title: "Text Added",
        description: "Click on the text to edit it.",
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
      console.log('Adding shape:', shapeType);
      if (!fabricCanvas) {
        console.error('Canvas not initialized');
        return;
      }

      let shape;
      if (shapeType === 'rectangle') {
        shape = new Rect({
          left: 150,
          top: 150,
          width: 100,
          height: 100,
          fill: '#3B82F6',
          stroke: '#1E40AF',
          strokeWidth: 2
        });
      } else {
        shape = new FabricCircle({
          left: 150,
          top: 150,
          radius: 50,
          fill: '#EF4444',
          stroke: '#DC2626',
          strokeWidth: 2
        });
      }
      
      fabricCanvas.add(shape);
      fabricCanvas.setActiveObject(shape);
      fabricCanvas.renderAll();
      console.log('Shape added successfully:', shapeType);
      
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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

    console.log('Processing image upload:', file.name, file.type, file.size);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgURL = e.target?.result as string;
      if (!imgURL) {
        console.error('Failed to read image file');
        return;
      }

      console.log('Image file read, creating FabricImage...');
      
      FabricImage.fromURL(imgURL)
        .then((img) => {
          console.log('FabricImage created successfully');
          
          // Scale image to fit nicely on canvas
          const maxWidth = 300;
          if (img.width && img.width > maxWidth) {
            img.scaleToWidth(maxWidth);
          }
          
          img.set({
            left: 100,
            top: 200
          });
          
          fabricCanvas.add(img);
          fabricCanvas.setActiveObject(img);
          fabricCanvas.renderAll();
          
          console.log('Image added to canvas successfully');
          toast({
            title: "Image Added",
            description: "Image uploaded successfully.",
          });
        })
        .catch((error) => {
          console.error('Error creating FabricImage:', error);
          toast({
            title: "Image Error",
            description: "Failed to load image. Please try a different file.",
            variant: "destructive"
          });
        });
    };

    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      toast({
        title: "File Error",
        description: "Failed to read image file.",
        variant: "destructive"
      });
    };

    reader.readAsDataURL(file);
    
    // Clear the input so the same file can be uploaded again
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

  const handleSave = () => {
    console.log('Save button clicked - redirecting to login');
    toast({
      title: "Sign in required",
      description: "Please sign in to save your project.",
    });
    navigate("/login");
  };

  const handleDownload = () => {
    try {
      console.log('Starting download process');
      if (!fabricCanvas) {
        console.error('Canvas not initialized');
        toast({
          title: "Error",
          description: "Canvas not ready for download.",
          variant: "destructive"
        });
        return;
      }
      
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1
      });
      
      const link = document.createElement('a');
      link.download = `design-${Date.now()}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Download completed successfully');
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

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
            <div className="bg-white shadow-lg rounded-lg p-4">
              <canvas 
                ref={canvasRef} 
                className="border border-gray-200 max-w-full"
                style={{ display: 'block' }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Editor;
