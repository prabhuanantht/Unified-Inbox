import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Img,
} from '@react-email/components';

interface EmailTemplateProps {
  content: string;
  mediaUrls?: string[];
}

export function EmailTemplate({ content, mediaUrls = [] }: EmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={section}>
            <Text style={text}>{content}</Text>
            
            {mediaUrls.length > 0 && (
              <div style={mediaContainer}>
                {mediaUrls.map((url, index) => (
                  url.startsWith('data:image') ? (
                    <Img
                      key={index}
                      src={url}
                      alt={`Attachment ${index + 1}`}
                      style={image}
                    />
                  ) : (
                    <Link key={index} href={url} style={link}>
                      {url}
                    </Link>
                  )
                ))}
              </div>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
};

const section = {
  padding: '0 48px',
};

const text = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#333333',
  whiteSpace: 'pre-wrap',
};

const mediaContainer = {
  marginTop: '20px',
};

const image = {
  maxWidth: '500px',
  borderRadius: '4px',
  marginBottom: '10px',
};

const link = {
  color: '#0066cc',
  textDecoration: 'underline',
  display: 'block',
  marginBottom: '8px',
};

