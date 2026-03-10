import React from 'react';
import MDEditor, { commands } from '@uiw/react-md-editor';

interface LazyEditorProps {
  value: string;
  onChange: (val: string | undefined) => void;
}

export default function LazyEditor({ value, onChange }: LazyEditorProps) {
  return (
    <MDEditor
      value={value}
      onChange={onChange}
      height={400}
      preview="edit"
      commands={[
        ...commands.getCommands().filter(c => c.name !== 'image'),
        {
          name: 'image-upload',
          keyCommand: 'image-upload',
          buttonProps: { 'aria-label': 'Insert Image' },
          icon: (
            <svg width="12" height="12" viewBox="0 0 20 20">
              <path fill="currentColor" d="M15 9c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4-7H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zm-1 13l-6-5-2 2-4-5-4 8V4h16v11z"></path>
            </svg>
          ),
          execute: (state, api) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e: any) => {
              const file = e.target.files[0];
              if (file) {
                const formData = new FormData();
                formData.append('image', file);
                try {
                  const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                  });
                  if (res.ok) {
                    const data = await res.json();
                    const imageMarkdown = `![${file.name}](${data.url})`;
                    api.replaceSelection(imageMarkdown);
                  } else {
                    alert("Error al subir la imagen");
                  }
                } catch (err) {
                  alert("Error de conexión al subir la imagen");
                }
              }
            };
            input.click();
          }
        }
      ]}
    />
  );
}
