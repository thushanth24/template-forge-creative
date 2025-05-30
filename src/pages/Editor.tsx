
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
        console.log('Initializing Fabric.js canvas...');
        if (canvasRef.current) {
          const canvas = new FabricCanvas(canvasRef.current, {
            width: 800,
            height: 1000,
            backgroundColor: 'white'
          });

          console.log('Canvas created:', canvas);
          
          // Load template based on ID
          loadTemplate(canvas, templateId);
          
          // Handle object selection with correct event structure
          canvas.on('selection:created', (e: any) => {
            console.log('Selection created:', e);
            const activeObject = canvas.getActiveObject();
            setSelectedObject(activeObject);
          });
          
          canvas.on('selection:updated', (e: any) => {
            console.log('Selection updated:', e);
            const activeObject = canvas.getActiveObject();
            setSelectedObject(activeObject);
          });
          
          canvas.on('selection:cleared', () => {
            console.log('Selection cleared');
            setSelectedObject(null);
          });

          setFabricCanvas(canvas);
          setIsLoading(false);
          console.log('Canvas initialization complete');
        }
      } catch (error) {
        console.error('Failed to initialize Fabric.js:', error);
        toast({
          title: "Error",
          description: "Failed to load the editor. Please try again.",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    };

    initializeFabric();

    return () => {
      if (fabricCanvas) {
        console.log('Disposing canvas');
        fabricCanvas.dispose();
      }
    };
  }, [templateId]);

  const loadTemplate = (canvas: FabricCanvas, id: string | undefined) => {
    console.log('Loading template:', id);
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
          }
        ]
      }
    };

    const template = templates[id || "1"];
    if (template && template.objects) {
      template.objects.forEach((obj: any) => {
        if (obj.type === 'textbox') {
          const textbox = new Textbox(obj.text, {
            left: obj.left,
            top: obj.top,
            fontSize: obj.fontSize,
            fontWeight: obj.fontWeight,
            fill: obj.fill || '#000'
          });
          canvas.add(textbox);
        }
      });
      canvas.renderAll();
      console.log('Template loaded successfully');
    }
  };

  const addText = () => {
    console.log('Adding text element');
    if (!fabricCanvas) return;
    
    const text = new Textbox('Click to edit text', {
      left: 100,
      top: 100,
      fontSize: 16,
      fill: '#000'
    });
    
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    console.log('Text element added');
  };

  const addShape = (shapeType: 'rectangle' | 'circle') => {
    console.log('Adding shape:', shapeType);
    if (!fabricCanvas) return;

    let shape;
    if (shapeType === 'rectangle') {
      shape = new Rect({
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        fill: '#3B82F6'
      });
    } else {
      shape = new FabricCircle({
        left: 100,
        top: 100,
        radius: 50,
        fill: '#EF4444'
      });
    }
    
    fabricCanvas.add(shape);
    fabricCanvas.setActiveObject(shape);
    fabricCanvas.renderAll();
    console.log('Shape added successfully');
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fabricCanvas) return;

    console.log('Uploading image:', file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgURL = e.target?.result as string;
      FabricImage.fromURL(imgURL).then((img) => {
        img.scaleToWidth(200);
        img.set({
          left: 100,
          top: 100
        });
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
        fabricCanvas.renderAll();
        console.log('Image added successfully');
      }).catch((error) => {
        console.error('Error loading image:', error);
        toast({
          title: "Error",
          description: "Failed to load image. Please try again.",
          variant: "destructive"
        });
      });
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    console.log('Deleting selected object');
    if (!fabricCanvas || !selectedObject) return;
    
    fabricCanvas.remove(selectedObject);
    fabricCanvas.renderAll();
    setSelectedObject(null);
    console.log('Object deleted');
  };

  const handleSave = () => {
    toast({
      title: "Sign in required",
      description: "Please sign in to save your project.",
    });
    navigate("/login");
  };

  const handleDownload = () => {
    console.log('Downloading canvas as PNG');
    if (!fabricCanvas) return;
    
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1
    });
    
    const link = document.createElement('a');
    link.download = 'design.png';
    link.href = dataURL;
    link.click();
    console.log('Download initiated');
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
              <Button variant="outline" size="sm">
                <Undo className="h-4 w-4 mr-2" />
                Undo
              </Button>
              <Button variant="outline" size="sm">
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
                    className="w-full justify-start"
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
              <canvas ref={canvasRef} className="border border-gray-200" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Editor;
