import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Grid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

interface Template {
  id: string;
  title: string;
  category: string;
  thumbnail: string;
  description: string;
}

const categories = ["All", "Resume", "Cover Letter", "Poster", "Business Card", "Social Media", "Flyer"];

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Fetch templates from Supabase
  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*");
      if (error) {
        console.error("Error fetching templates:", error);
      } else {
        setTemplates(data || []);
        setFilteredTemplates(data || []);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    let filtered = templates;
    if (selectedCategory !== "All") {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }
    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredTemplates(filtered);
  }, [searchTerm, selectedCategory, templates]);

  const handleTemplateSelect = (templateId: string) => {
    navigate(`/editor/${templateId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">DesignForge</h1>
            </div>
            <div className="flex items-center space-x-4">
              {loading ? null : user ? (
                <>
                  <span className="font-medium">Hello, {user.user_metadata?.name || "User"}!</span>
                  <Button variant="outline" onClick={signOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => navigate("/login")}>Sign In</Button>
                  <Button onClick={() => navigate("/login")}>Get Started</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-blue-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold mb-6">Design Anything, Anywhere</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Create stunning designs with our easy-to-use templates. No design experience needed.
          </p>
          <Button size="lg" variant="secondary" className="text-primary">
            Start Designing
          </Button>
        </div>
      </section>

      {/* Templates Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">Choose a Template</h3>
            <p className="text-gray-600">Start with a professionally designed template</p>
          </div>
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6 lg:mt-0">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className={`grid gap-6 ${
          viewMode === "grid" 
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
            : "grid-cols-1"
        }`}>
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200 group"
              onClick={() => handleTemplateSelect(template.id)}
            >
              <CardContent className="p-0">
                <div className="aspect-[3/4] bg-gray-200 rounded-t-lg overflow-hidden">
                  <img
                    src={template.thumbnail}
                    alt={template.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                      {template.category}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">{template.title}</h4>
                  <p className="text-sm text-gray-600">{template.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No templates found matching your criteria.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default Index;
