
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Edit, Trash2, Download } from "lucide-react";

interface Project {
  id: string;
  title: string;
  thumbnail: string;
  lastModified: string;
  template: string;
}

const MyProjects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Mock projects data - this will be replaced with Supabase data
    const mockProjects: Project[] = [
      {
        id: "1",
        title: "My Resume",
        thumbnail: "/placeholder.svg",
        lastModified: "2 hours ago",
        template: "Modern Resume"
      },
      {
        id: "2", 
        title: "Cover Letter Draft",
        thumbnail: "/placeholder.svg",
        lastModified: "1 day ago",
        template: "Creative Cover Letter"
      }
    ];
    
    setProjects(mockProjects);
  }, []);

  const handleEditProject = (projectId: string) => {
    navigate(`/editor/${projectId}`);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  const handleSignOut = () => {
    // Placeholder for sign out logic
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Templates
              </Button>
              <h1 className="text-2xl font-bold text-primary">DesignForge</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">My Projects</h2>
          <p className="text-gray-600">Manage and edit your saved designs</p>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="mb-4">
                <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Edit className="h-6 w-6 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
              <p className="text-gray-500 mb-6">
                Start creating your first design by choosing a template.
              </p>
              <Button onClick={() => navigate("/")}>
                Browse Templates
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="group hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-0">
                  <div className="aspect-[3/4] bg-gray-200 rounded-t-lg overflow-hidden">
                    <img
                      src={project.thumbnail}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1">{project.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      Based on {project.template}
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                      Modified {project.lastModified}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <Button 
                        size="sm" 
                        onClick={() => handleEditProject(project.id)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      
                      <div className="flex space-x-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Handle download
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyProjects;
