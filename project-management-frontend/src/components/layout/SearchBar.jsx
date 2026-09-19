import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { globalSearch } from "../../services/searchService";



export default function SearchBar() {
  
  const [query, setQuery] = useState("");

const [results, setResults] = useState({
  projects: [],
  tasks: [],
});

const [showResults, setShowResults] = useState(false);


useEffect(() => {
  const fetchSearch = async () => {

    if (query.trim() === "") {

      setResults({
        projects: [],
        tasks: [],
      });

      return;
    }

    try {

      const res = await globalSearch(query);

      setResults(res.data.data);

      setShowResults(true);

    } catch (error) {

      console.log(error);

    }

  };

  const timer = setTimeout(fetchSearch, 300);

  return () => clearTimeout(timer);

}, [query]);

  
  return (
    <div className="relative w-full max-w-md">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
      />

<div className="relative">
      <input
    type="text"
    placeholder="Search..."
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    className="
      w-full
      border
      rounded-xl
      py-3
      pl-11
      pr-4
      outline-none
      focus:ring-2
      focus:ring-blue-500
    "
  />


{
showResults &&
query && (

<div
className="
absolute
top-12
left-0
w-96
bg-white
border
rounded-xl
shadow-lg
z-50
max-h-96
overflow-y-auto
">

{
results.projects.length > 0 && (

<div className="p-3">

<p className="font-semibold mb-2">
Projects
</p>

{
results.projects.map((project)=>(

<Link
key={project._id}
to={`/projects/${project._id}`}
onClick={()=>{
setQuery("");
setShowResults(false);
}}
className="
block
p-2
rounded-lg
hover:bg-gray-100
"
>

{project.name}

</Link>

))
}

</div>

)
}

{
results.tasks.length > 0 && (

<div className="p-3 border-t">

<p className="font-semibold mb-2">
Tasks
</p>

{
results.tasks.map((task)=>(

<Link
key={task._id}
to={`/projects/${task.project._id}/tasks/${task._id}`}
onClick={()=>{
setQuery("");
setShowResults(false);
}}
className="
block
p-2
rounded-lg
hover:bg-gray-100
"
>

<div className="font-medium">
{task.title}
</div>

<div className="text-xs text-gray-500">
{task.project?.name}
</div>

</Link>

))
}

</div>

)
}

{
results.projects.length===0 &&
results.tasks.length===0 && (

<p className="p-4 text-gray-500">
No results found.
</p>

)
}

</div>

)
}
</div>
     


    </div>
  );
}