import { useEffect, useState } from 'react';

function App() {
  const [todos, setTodos] = useState<
    { id: string; title: string; completed: boolean }[]
  >([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL}/todos`)
      .then((response) => response.json())
      .then((data) => setTodos(data))
      .catch((error) => console.error('Error fetching todos:', error));
  }, []);

  return (
    <div>
      <h1>Todos</h1>

      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>
            <span>{todo.title}</span>
            <span>{todo.completed ? ' (Completed)' : ''}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
