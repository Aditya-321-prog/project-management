import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createProject } from "../../services/projectService";


export default function CreateProject(){

  const navigate = useNavigate();


  const [form,setForm] = useState({
    name:"",
    description:"",
  });


  const [loading,setLoading] = useState(false);

  // const {
  //   fetchNotifications,
  // } = useNotifications();


  const handleChange=(e)=>{

    setForm({
      ...form,
      [e.target.name]:e.target.value
    });

  };


  const handleSubmit=async(e)=>{

    e.preventDefault();

    try{

      setLoading(true);

      await createProject(form);

      // await fetchNotifications();

      navigate("/projects", {
        replace:true
      });

    }
    catch(error){

      console.log(
        error.response?.data || error
      );

    }
    finally{

      setLoading(false);

    }

  };


  return(

    <div className="max-w-xl">

      <h1
        className="
          text-3xl
          font-bold
          mb-8
          text-slate-900
          dark:text-white
        "
      >
        Create Project
      </h1>


      <form
        onSubmit={handleSubmit}
        className="
          space-y-5
          bg-white
          dark:bg-slate-900
          border
          border-slate-200
          dark:border-slate-800
          rounded-2xl
          p-6
        "
      >


        <input

          name="name"

          placeholder="Project name"

          value={form.name}

          onChange={handleChange}

          className="
            w-full
            border
            border-slate-300
            dark:border-slate-700
            bg-white
            dark:bg-slate-800
            text-slate-900
            dark:text-white
            placeholder:text-slate-400
            dark:placeholder:text-slate-500
            rounded-xl
            px-4
            py-3
            outline-none
            focus:ring-2
            focus:ring-blue-500
          "

        />


        <textarea

          name="description"

          placeholder="Project description"

          value={form.description}

          onChange={handleChange}

          rows="5"

          className="
            w-full
            border
            border-slate-300
            dark:border-slate-700
            bg-white
            dark:bg-slate-800
            text-slate-900
            dark:text-white
            placeholder:text-slate-400
            dark:placeholder:text-slate-500
            rounded-xl
            px-4
            py-3
            outline-none
            focus:ring-2
            focus:ring-blue-500
            resize-none
          "

        />


        <button

          disabled={loading}

          className="
            bg-blue-600
            hover:bg-blue-700
            text-white
            px-5
            py-3
            rounded-xl
            transition
            disabled:opacity-50
          "

        >

          {
            loading
              ?
              "Creating..."
              :
              "Create Project"
          }

        </button>


      </form>


    </div>

  )

}